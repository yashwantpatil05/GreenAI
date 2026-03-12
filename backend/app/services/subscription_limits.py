"""Subscription limit enforcement service."""
import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.models.organization import Organization
from backend.app.models.job_run import JobRun
from backend.app.models.project import Project
from backend.app.models.organization_member import OrganizationMember


logger = logging.getLogger(__name__)


class SubscriptionLimitError(HTTPException):
    """Exception raised when subscription limit is exceeded."""

    def __init__(self, message: str, limit_type: str, current: int, limit: int):
        super().__init__(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "subscription_limit_exceeded",
                "message": message,
                "limit_type": limit_type,
                "current_usage": current,
                "plan_limit": limit,
                "upgrade_url": "/billing"
            }
        )


def check_job_runs_limit(organization_id: UUID, db: Session) -> None:
    """Check if organization has exceeded job runs limit for current month.

    Args:
        organization_id: Organization UUID
        db: Database session

    Raises:
        SubscriptionLimitError: If limit is exceeded
    """
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Unlimited plans (enterprise) have limit = -1
    if org.job_runs_limit == -1:
        return

    # Get current month's job run count
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    current_count = db.query(func.count(JobRun.id)).filter(
        JobRun.organization_id == organization_id,
        JobRun.created_at >= month_start
    ).scalar() or 0

    if current_count >= org.job_runs_limit:
        logger.warning(
            f"Job runs limit exceeded for org {organization_id}: "
            f"{current_count}/{org.job_runs_limit}"
        )
        raise SubscriptionLimitError(
            message=f"You have reached your plan's limit of {org.job_runs_limit:,} job runs per month. "
                    f"Upgrade your plan to track more runs.",
            limit_type="job_runs",
            current=current_count,
            limit=org.job_runs_limit
        )


def check_projects_limit(organization_id: UUID, db: Session) -> None:
    """Check if organization has exceeded projects limit.

    Args:
        organization_id: Organization UUID
        db: Database session

    Raises:
        SubscriptionLimitError: If limit is exceeded
    """
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Unlimited plans (enterprise) have limit = -1
    if org.projects_limit == -1:
        return

    # Count active projects
    current_count = db.query(func.count(Project.id)).filter(
        Project.organization_id == organization_id
    ).scalar() or 0

    if current_count >= org.projects_limit:
        logger.warning(
            f"Projects limit exceeded for org {organization_id}: "
            f"{current_count}/{org.projects_limit}"
        )
        raise SubscriptionLimitError(
            message=f"You have reached your plan's limit of {org.projects_limit} projects. "
                    f"Upgrade your plan to create more projects.",
            limit_type="projects",
            current=current_count,
            limit=org.projects_limit
        )


def check_users_limit(organization_id: UUID, db: Session) -> None:
    """Check if organization has exceeded users limit.

    Args:
        organization_id: Organization UUID
        db: Database session

    Raises:
        SubscriptionLimitError: If limit is exceeded
    """
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Unlimited plans (enterprise) have limit = -1
    if org.users_limit == -1:
        return

    # Count organization members
    current_count = db.query(func.count(OrganizationMember.id)).filter(
        OrganizationMember.organization_id == organization_id
    ).scalar() or 0

    if current_count >= org.users_limit:
        logger.warning(
            f"Users limit exceeded for org {organization_id}: "
            f"{current_count}/{org.users_limit}"
        )
        raise SubscriptionLimitError(
            message=f"You have reached your plan's limit of {org.users_limit} team members. "
                    f"Upgrade your plan to add more users.",
            limit_type="users",
            current=current_count,
            limit=org.users_limit
        )


def check_subscription_active(organization_id: UUID, db: Session) -> None:
    """Check if organization has an active subscription.

    Args:
        organization_id: Organization UUID
        db: Database session

    Raises:
        HTTPException: If subscription is not active
    """
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Check subscription status
    if org.subscription_status == "expired":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "subscription_expired",
                "message": "Your subscription has expired. Please renew to continue using GreenAI.",
                "renew_url": "/billing"
            }
        )

    if org.subscription_status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "subscription_suspended",
                "message": "Your subscription has been suspended. Please contact support.",
                "support_url": "/support"
            }
        )


def get_usage_stats_for_limits(organization_id: UUID, db: Session) -> dict:
    """Get current usage statistics for limit checking.

    Args:
        organization_id: Organization UUID
        db: Database session

    Returns:
        Dictionary with current usage and limits
    """
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Get current month's job run count
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    job_runs_count = db.query(func.count(JobRun.id)).filter(
        JobRun.organization_id == organization_id,
        JobRun.created_at >= month_start
    ).scalar() or 0

    projects_count = db.query(func.count(Project.id)).filter(
        Project.organization_id == organization_id
    ).scalar() or 0

    users_count = db.query(func.count(OrganizationMember.id)).filter(
        OrganizationMember.organization_id == organization_id
    ).scalar() or 0

    return {
        "job_runs": {
            "current": job_runs_count,
            "limit": org.job_runs_limit,
            "percentage": (job_runs_count / org.job_runs_limit * 100) if org.job_runs_limit > 0 else 0,
            "unlimited": org.job_runs_limit == -1
        },
        "projects": {
            "current": projects_count,
            "limit": org.projects_limit,
            "percentage": (projects_count / org.projects_limit * 100) if org.projects_limit > 0 else 0,
            "unlimited": org.projects_limit == -1
        },
        "users": {
            "current": users_count,
            "limit": org.users_limit,
            "percentage": (users_count / org.users_limit * 100) if org.users_limit > 0 else 0,
            "unlimited": org.users_limit == -1
        },
        "subscription_status": org.subscription_status,
        "subscription_plan": org.subscription_plan
    }
