"""Billing service for Razorpay subscription management."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from uuid import UUID

import razorpay
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.models.organization import Organization
from backend.app.services.cache_service import get_cache

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize Razorpay client
razorpay_client = None
if settings.razorpay_key_id and settings.razorpay_key_secret.get_secret_value():
    razorpay_client = razorpay.Client(
        auth=(settings.razorpay_key_id, settings.razorpay_key_secret.get_secret_value())
    )

# Subscription Plans
PLANS = {
    "starter": {
        "id": "starter",
        "name": "Starter",
        "price": 299900,  # ₹2,999 in paise
        "currency": "INR",
        "job_runs_limit": 10000,
        "projects_limit": 3,
        "users_limit": 2,
        "overage_rate": 50,  # ₹0.50 per extra run in paise
        "features": [
            "10,000 job runs/month",
            "3 projects",
            "2 team members",
            "Basic analytics",
            "Email support",
        ],
    },
    "pro": {
        "id": "pro",
        "name": "Pro",
        "price": 999900,  # ₹9,999 in paise
        "currency": "INR",
        "job_runs_limit": 100000,
        "projects_limit": 10,
        "users_limit": 10,
        "overage_rate": 30,  # ₹0.30 per extra run in paise
        "features": [
            "100,000 job runs/month",
            "10 projects",
            "10 team members",
            "Advanced analytics",
            "Priority support",
            "Custom reports",
        ],
    },
    "enterprise": {
        "id": "enterprise",
        "name": "Enterprise",
        "price": 0,  # Custom pricing
        "currency": "INR",
        "job_runs_limit": -1,  # Unlimited
        "projects_limit": -1,
        "users_limit": -1,
        "overage_rate": 0,
        "features": [
            "Unlimited job runs",
            "Unlimited projects",
            "Unlimited team members",
            "Dedicated support",
            "SLA guarantee",
            "Custom integrations",
            "On-premise option",
        ],
    },
}


def get_plans() -> list[Dict[str, Any]]:
    """Get all available subscription plans."""
    cache = get_cache()
    cache_key = cache.billing_plans_key()

    # Try to get from cache
    cached = cache.get(cache_key)
    if cached:
        return cached

    plans = list(PLANS.values())

    # Cache for 1 hour (3600 seconds) since plans are static
    cache.set(cache_key, plans, ttl_seconds=3600)
    return plans


def get_plan(plan_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific plan by ID."""
    return PLANS.get(plan_id)


def create_order(
    organization_id: UUID,
    plan_id: str,
    db: Session,
) -> Dict[str, Any]:
    """Create a Razorpay order for subscription."""
    if not razorpay_client:
        raise ValueError("Razorpay client not configured")
    
    plan = get_plan(plan_id)
    if not plan:
        raise ValueError(f"Invalid plan: {plan_id}")
    
    if plan["price"] == 0:
        raise ValueError("Enterprise plan requires custom pricing. Contact sales.")
    
    # Create Razorpay order
    order_data = {
        "amount": plan["price"],
        "currency": plan["currency"],
        "receipt": f"order_{organization_id}_{plan_id}",
        "notes": {
            "organization_id": str(organization_id),
            "plan_id": plan_id,
        },
    }
    
    try:
        order = razorpay_client.order.create(data=order_data)
        return {
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "plan": plan,
            "razorpay_key_id": settings.razorpay_key_id,
        }
    except Exception as e:
        logger.exception("Failed to create Razorpay order")
        raise ValueError(f"Payment error: {str(e)}")


def verify_payment(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
) -> bool:
    """Verify Razorpay payment signature."""
    if not razorpay_client:
        raise ValueError("Razorpay client not configured")

    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature,
        })
        return True
    except razorpay.errors.SignatureVerificationError:
        return False


def verify_webhook_signature(payload: str, signature: str) -> bool:
    """Verify Razorpay webhook signature.

    Args:
        payload: Raw request body as string
        signature: X-Razorpay-Signature header value

    Returns:
        True if signature is valid, False otherwise
    """
    if not razorpay_client:
        logger.warning("Razorpay client not configured, skipping webhook verification")
        return False

    webhook_secret = settings.razorpay_webhook_secret.get_secret_value()
    if not webhook_secret:
        logger.warning("Razorpay webhook secret not configured, skipping verification")
        return False

    try:
        razorpay_client.utility.verify_webhook_signature(
            payload,
            signature,
            webhook_secret
        )
        return True
    except razorpay.errors.SignatureVerificationError as e:
        logger.warning(f"Webhook signature verification failed: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error during webhook verification: {e}")
        return False


def activate_subscription(
    organization_id: UUID,
    plan_id: str,
    payment_id: str,
    db: Session,
) -> Organization:
    """Activate subscription for organization after successful payment."""
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        raise ValueError("Organization not found")
    
    plan = get_plan(plan_id)
    if not plan:
        raise ValueError(f"Invalid plan: {plan_id}")
    
    # Update organization subscription
    org.subscription_plan = plan_id
    org.subscription_status = "active"
    org.subscription_started_at = datetime.now(timezone.utc)
    org.razorpay_payment_id = payment_id
    org.job_runs_limit = plan["job_runs_limit"]
    org.projects_limit = plan["projects_limit"]
    org.users_limit = plan["users_limit"]
    
    db.commit()
    db.refresh(org)
    
    return org


def get_usage_stats(organization_id: UUID, db: Session) -> Dict[str, Any]:
    """Get usage statistics for an organization."""
    from backend.app.models.job_run import JobRun, JobRunEnergy
    from backend.app.models.project import Project
    from backend.app.models.organization_member import OrganizationMember
    from sqlalchemy import func

    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        raise ValueError("Organization not found")

    # Count current month's job runs
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    job_runs_count = db.query(JobRun).filter(
        JobRun.organization_id == organization_id,
        JobRun.created_at >= month_start,
    ).count()

    # Get energy and emissions totals for current period
    energy_stats = db.query(
        func.sum(JobRunEnergy.total_kwh).label("total_energy"),
        func.sum(JobRunEnergy.emissions_kg).label("total_emissions")
    ).join(JobRun).filter(
        JobRun.organization_id == organization_id,
        JobRun.created_at >= month_start
    ).first()

    total_energy_kwh = float(energy_stats.total_energy) if energy_stats.total_energy else 0.0
    total_emissions_kg = float(energy_stats.total_emissions) if energy_stats.total_emissions else 0.0

    projects_count = db.query(Project).filter(
        Project.organization_id == organization_id,
    ).count()

    users_count = db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == organization_id,
    ).count()

    # Get plan limits
    plan = get_plan(org.subscription_plan or "starter")

    return {
        "current_period": {
            "job_runs": job_runs_count,
            "total_energy_kwh": total_energy_kwh,
            "total_emissions_kg": total_emissions_kg,
            "projects": projects_count,
            "users": users_count,
        },
        "limits": {
            "job_runs_limit": plan["job_runs_limit"] if plan else 10000,
            "projects_limit": plan["projects_limit"] if plan else 3,
            "users_limit": plan["users_limit"] if plan else 2,
        },
        "usage_percentage": {
            "job_runs": (job_runs_count / plan["job_runs_limit"] * 100) if plan and plan["job_runs_limit"] > 0 else 0,
            "projects": (projects_count / plan["projects_limit"] * 100) if plan and plan["projects_limit"] > 0 else 0,
            "users": (users_count / plan["users_limit"] * 100) if plan and plan["users_limit"] > 0 else 0,
        },
        "subscription": {
            "plan": org.subscription_plan or "starter",
            "status": org.subscription_status or "trial",
            "started_at": org.subscription_started_at.isoformat() if org.subscription_started_at else None,
        },
    }


def calculate_overage(organization_id: UUID, db: Session) -> Dict[str, Any]:
    """Calculate overage charges for the current billing period."""
    usage = get_usage_stats(organization_id, db)

    org = db.query(Organization).filter(Organization.id == organization_id).first()
    plan = get_plan(org.subscription_plan or "starter")

    current_usage = usage["current_period"]["job_runs"]
    limit = usage["limits"]["job_runs_limit"]

    # Handle unlimited plans
    if limit < 0:
        overage_runs = 0
        exceeded = False
    else:
        overage_runs = max(0, current_usage - limit)
        exceeded = current_usage > limit

    overage_amount = overage_runs * plan["overage_rate"] if plan else 0

    return {
        "exceeded": exceeded,
        "current_usage": current_usage,
        "limit": limit,
        "overage_runs": overage_runs,
        "overage_rate": plan["overage_rate"] if plan else 50,
        "overage_amount": overage_amount,
        "overage_amount_formatted": f"₹{overage_amount / 100:.2f}",
    }
