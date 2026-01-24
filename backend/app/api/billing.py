"""Billing API routes for subscription management."""
from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.auth.deps import get_current_user, require_roles
from backend.app.core.database import get_db
from backend.app.services.billing_service import (
    get_plans,
    get_plan,
    create_order,
    verify_payment,
    activate_subscription,
    get_usage_stats,
    calculate_overage,
)

logger = logging.getLogger(__name__)
router = APIRouter()


class CreateOrderRequest(BaseModel):
    plan_id: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan_id: str


@router.get("/plans/")
@router.get("/plans")
def list_plans():
    """Get all available subscription plans."""
    return {"plans": get_plans()}


@router.get("/plans/{plan_id}")
def get_plan_details(plan_id: str):
    """Get details of a specific plan."""
    plan = get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.post("/create-order/")
@router.post("/create-order")
def create_payment_order(
    payload: CreateOrderRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Create a Razorpay order for subscription payment."""
    try:
        order = create_order(
            organization_id=user.organization_id,
            plan_id=payload.plan_id,
            db=db,
        )
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Failed to create order")
        raise HTTPException(status_code=500, detail="Payment service error")


@router.post("/verify-payment/")
@router.post("/verify-payment")
def verify_and_activate(
    payload: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Verify payment signature and activate subscription."""
    # Verify signature
    is_valid = verify_payment(
        razorpay_order_id=payload.razorpay_order_id,
        razorpay_payment_id=payload.razorpay_payment_id,
        razorpay_signature=payload.razorpay_signature,
    )
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    
    # Activate subscription
    try:
        org = activate_subscription(
            organization_id=user.organization_id,
            plan_id=payload.plan_id,
            payment_id=payload.razorpay_payment_id,
            db=db,
        )
        return {
            "success": True,
            "message": "Subscription activated successfully",
            "subscription": {
                "plan": org.subscription_plan,
                "status": org.subscription_status,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/usage")
def get_organization_usage(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get usage statistics for the current organization."""
    try:
        return get_usage_stats(user.organization_id, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/overage")
def get_overage_charges(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get overage charges for the current billing period."""
    try:
        return calculate_overage(user.organization_id, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Razorpay webhook events."""
    try:
        payload = await request.json()
        event = payload.get("event")
        
        logger.info(f"Received Razorpay webhook: {event}")
        
        # Handle different webhook events
        if event == "payment.captured":
            # Payment was successful
            payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
            notes = payment_entity.get("notes", {})
            org_id = notes.get("organization_id")
            plan_id = notes.get("plan_id")
            
            if org_id and plan_id:
                activate_subscription(
                    organization_id=org_id,
                    plan_id=plan_id,
                    payment_id=payment_entity.get("id"),
                    db=db,
                )
        
        elif event == "payment.failed":
            # Handle payment failure
            logger.warning(f"Payment failed: {payload}")
        
        return {"status": "processed"}
    except Exception as e:
        logger.exception("Webhook processing failed")
        raise HTTPException(status_code=500, detail="Webhook processing error")
