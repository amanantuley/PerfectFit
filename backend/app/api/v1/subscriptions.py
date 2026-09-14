"""Subscription management routes"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime, timedelta
from app.db.database import get_db
from app.models import Subscription, Payment, User
from app.schemas.schemas import SubscriptionResponse
from app.core.security import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

# Subscription plan definitions (could be in database for admin management)
SUBSCRIPTION_PLANS = {
    "basic": {
        "name": "Basic",
        "price": 299.0,
        "duration_days": 30,
        "features": ["Access to store", "Basic support"]
    },
    "premium": {
        "name": "Premium",
        "price": 599.0,
        "duration_days": 30,
        "features": ["Access to store", "Premium support", "Exclusive discounts", "Priority tailor access"]
    },
    "vip": {
        "name": "VIP",
        "price": 999.0,
        "duration_days": 30,
        "features": ["Access to store", "24/7 support", "Exclusive discounts", "Priority tailor access", "Free alterations"]
    }
}


@router.get("/plans")
async def get_subscription_plans():
    """Get available subscription plans"""
    return {
        "plans": [
            {
                "id": plan_id,
                "name": plan_data["name"],
                "price": plan_data["price"],
                "duration_days": plan_data["duration_days"],
                "features": plan_data["features"]
            }
            for plan_id, plan_data in SUBSCRIPTION_PLANS.items()
        ]
    }


@router.get("", response_model=List[SubscriptionResponse])
async def get_user_subscriptions(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all subscriptions for current user"""
    subscriptions = db.query(Subscription).filter(
        Subscription.user_id == current_user["user_id"]
    ).order_by(Subscription.created_at.desc()).all()
    
    return subscriptions


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
async def get_subscription(
    subscription_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get subscription details"""
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.user_id == current_user["user_id"]
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    return subscription


@router.post("/plans/{plan_id}/purchase")
async def purchase_subscription(
    plan_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initiate subscription purchase (creates Razorpay order)
    
    Returns Razorpay order details to proceed with payment
    """
    if plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found"
        )
    
    # Check for active subscription
    active_subscription = db.query(Subscription).filter(
        Subscription.user_id == current_user["user_id"],
        Subscription.status == "active"
    ).first()
    
    if active_subscription:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has an active subscription"
        )
    
    plan_data = SUBSCRIPTION_PLANS[plan_id]
    user_id = current_user["user_id"]
    
    # Create subscription record (status: pending until payment verified)
    subscription = Subscription(
        user_id=user_id,
        plan_type=plan_id,
        price=plan_data["price"],
        status="pending",
        auto_renew=True,
        start_date=datetime.utcnow(),
        end_date=datetime.utcnow() + timedelta(days=plan_data["duration_days"])
    )
    
    db.add(subscription)
    db.flush()  # Get subscription ID without committing
    
    # Create payment record
    payment = Payment(
        subscription_id=subscription.id,
        user_id=user_id,
        amount=plan_data["price"],
        currency="INR",
        payment_method="razorpay",
        status="pending"
    )
    
    db.add(payment)
    db.commit()
    db.refresh(subscription)
    db.refresh(payment)
    
    logger.info(f"✓ Subscription purchase initiated: {subscription.id} for user {user_id}")
    
    # Return information for Razorpay order creation
    # The frontend will need to call /payments/razorpay/create-order with subscription_id
    return {
        "subscription_id": str(subscription.id),
        "payment_id": str(payment.id),
        "plan_id": plan_id,
        "plan_name": plan_data["name"],
        "amount": plan_data["price"],
        "currency": "INR",
        "message": "Proceed to payment verification"
    }


@router.post("/{subscription_id}/cancel")
async def cancel_subscription(
    subscription_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel subscription"""
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.user_id == current_user["user_id"]
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    if subscription.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subscription is already cancelled"
        )
    
    subscription.status = "cancelled"
    subscription.auto_renew = False
    subscription.cancelled_at = datetime.utcnow()
    
    db.commit()
    db.refresh(subscription)
    
    logger.info(f"✓ Subscription cancelled: {subscription.id}")
    
    return {
        "status": "success",
        "message": "Subscription cancelled successfully",
        "subscription_id": str(subscription.id)
    }


@router.get("/{subscription_id}/status")
async def get_subscription_status(
    subscription_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current subscription status"""
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.user_id == current_user["user_id"]
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    # Check if subscription has expired
    if subscription.end_date and subscription.end_date < datetime.utcnow() and subscription.status == "active":
        subscription.status = "expired"
        db.commit()
    
    return {
        "subscription_id": str(subscription.id),
        "status": subscription.status,
        "plan_type": subscription.plan_type,
        "start_date": subscription.start_date,
        "end_date": subscription.end_date,
        "renewal_date": subscription.renewal_date,
        "auto_renew": subscription.auto_renew,
        "days_remaining": max(0, (subscription.end_date - datetime.utcnow()).days) if subscription.end_date else None
    }
