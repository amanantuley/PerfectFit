"""Routes for the application features backed by the additional database models."""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, get_current_tailor_user
from app.db.database import get_db
from app.models import (Measurement, Message, Notification, Order, PaymentStatus,
                        ReturnRequest, Reward, Subscription, Tailor, Transaction, Wallet)
from app.schemas.schemas import (MeasurementCreate, MeasurementResponse, MessageCreate,
    MessageResponse, NotificationResponse, ReturnRequestCreate, ReturnRequestResponse,
    RewardResponse, SubscriptionCreate, SubscriptionResponse, TailorCreate, TailorResponse,
    TransactionResponse, WalletAddMoney, WalletResponse)

router = APIRouter(tags=["Platform"])


def wallet_for(user_id, db: Session) -> Wallet:
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not wallet:
        wallet = Wallet(user_id=user_id, balance=0)
        db.add(wallet)
        db.flush()
    return wallet


def reward_for(user_id, db: Session) -> Reward:
    reward = db.query(Reward).filter(Reward.user_id == user_id).first()
    if not reward:
        reward = Reward(user_id=user_id, points_earned=0, points_used=0, current_balance=0)
        db.add(reward)
        db.flush()
    return reward


@router.get("/measurements", response_model=list[MeasurementResponse])
async def list_measurements(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Measurement).filter(Measurement.user_id == current_user["user_id"]).order_by(Measurement.created_at.desc()).all()


@router.post("/measurements", response_model=MeasurementResponse, status_code=status.HTTP_201_CREATED)
async def create_measurement(data: MeasurementCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    measurement = Measurement(user_id=current_user["user_id"], **data.model_dump())
    db.add(measurement)
    db.commit(); db.refresh(measurement)
    return measurement


@router.get("/messages", response_model=list[MessageResponse])
async def list_messages(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = current_user["user_id"]
    return db.query(Message).filter((Message.sender_id == user_id) | (Message.receiver_id == user_id)).order_by(Message.created_at.desc()).all()


@router.post("/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(data: MessageCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    message = Message(sender_id=current_user["user_id"], **data.model_dump())
    db.add(message)
    db.add(Notification(user_id=data.receiver_id, notification_type="message", title="New message", message=data.content[:160]))
    db.commit(); db.refresh(message)
    return message


@router.post("/messages/{message_id}/read")
async def mark_message_read(message_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    message = db.query(Message).filter(Message.id == message_id, Message.receiver_id == current_user["user_id"]).first()
    if not message: raise HTTPException(status_code=404, detail="Message not found")
    message.is_read, message.read_at = True, datetime.utcnow(); db.commit()
    return {"message": "Message marked as read"}


@router.get("/wallet", response_model=WalletResponse)
async def get_wallet(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    wallet = wallet_for(current_user["user_id"], db); db.commit(); db.refresh(wallet); return wallet


@router.post("/wallet/add-money", response_model=WalletResponse)
async def add_wallet_money(data: WalletAddMoney, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.amount <= 0: raise HTTPException(status_code=400, detail="Amount must be positive")
    wallet = wallet_for(current_user["user_id"], db); wallet.balance += data.amount
    db.add(Transaction(wallet_id=wallet.id, amount=data.amount, transaction_type="credit", description="Wallet top-up"))
    db.commit(); db.refresh(wallet); return wallet


@router.get("/wallet/transactions", response_model=list[TransactionResponse])
async def wallet_transactions(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    wallet = wallet_for(current_user["user_id"], db); db.commit()
    return db.query(Transaction).filter(Transaction.wallet_id == wallet.id).order_by(Transaction.created_at.desc()).all()


@router.get("/rewards", response_model=RewardResponse)
async def get_rewards(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    reward = reward_for(current_user["user_id"], db); db.commit(); db.refresh(reward); return reward


@router.post("/rewards/redeem", response_model=RewardResponse)
async def redeem_rewards(points: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    reward = reward_for(current_user["user_id"], db)
    if points <= 0 or points > reward.current_balance: raise HTTPException(status_code=400, detail="Insufficient reward points")
    reward.points_used += points; reward.current_balance -= points; db.commit(); db.refresh(reward); return reward


@router.get("/subscriptions", response_model=list[SubscriptionResponse])
async def list_subscriptions(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Subscription).filter(Subscription.user_id == current_user["user_id"]).order_by(Subscription.created_at.desc()).all()


@router.post("/subscriptions", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription(data: SubscriptionCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    prices = {"basic": 199.0, "premium": 499.0, "vip": 999.0}
    plan = data.plan_type.lower()
    if plan not in prices: raise HTTPException(status_code=400, detail="Unknown subscription plan")
    now = datetime.utcnow()
    db.query(Subscription).filter(Subscription.user_id == current_user["user_id"], Subscription.status == "active").update({"status": "cancelled", "cancelled_at": now})
    subscription = Subscription(user_id=current_user["user_id"], plan_type=plan, price=prices[plan], start_date=now, end_date=now + timedelta(days=30), renewal_date=now + timedelta(days=30))
    db.add(subscription); db.commit(); db.refresh(subscription); return subscription


@router.post("/subscriptions/{subscription_id}/cancel", response_model=SubscriptionResponse)
async def cancel_subscription(subscription_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id, Subscription.user_id == current_user["user_id"]).first()
    if not subscription: raise HTTPException(status_code=404, detail="Subscription not found")
    subscription.status, subscription.auto_renew, subscription.cancelled_at = "cancelled", False, datetime.utcnow(); db.commit(); db.refresh(subscription); return subscription


@router.get("/returns", response_model=list[ReturnRequestResponse])
async def list_returns(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(ReturnRequest).filter(ReturnRequest.user_id == current_user["user_id"]).order_by(ReturnRequest.created_at.desc()).all()


@router.post("/returns", response_model=ReturnRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_return(data: ReturnRequestCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == data.order_id, Order.user_id == current_user["user_id"]).first()
    if not order: raise HTTPException(status_code=404, detail="Order not found")
    if order.status.value not in {"delivered", "processing", "shipped"}: raise HTTPException(status_code=400, detail="This order cannot be returned yet")
    request = ReturnRequest(user_id=current_user["user_id"], **data.model_dump())
    db.add(request); db.commit(); db.refresh(request); return request


@router.get("/notifications", response_model=list[NotificationResponse])
async def list_notifications(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Notification).filter(Notification.user_id == current_user["user_id"]).order_by(Notification.created_at.desc()).all()


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    notification = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user["user_id"]).first()
    if not notification: raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True; db.commit(); return {"message": "Notification marked as read"}


@router.get("/tailors", response_model=list[TailorResponse])
async def list_tailors(db: Session = Depends(get_db)):
    return db.query(Tailor).filter(Tailor.is_active == True).all()


@router.get("/tailors/{tailor_id}", response_model=TailorResponse)
async def get_tailor(tailor_id: str, db: Session = Depends(get_db)):
    tailor = db.query(Tailor).filter(Tailor.id == tailor_id, Tailor.is_active == True).first()
    if not tailor: raise HTTPException(status_code=404, detail="Tailor not found")
    return tailor


@router.put("/tailors/me", response_model=TailorResponse)
async def update_my_tailor_profile(data: TailorCreate, current_user: dict = Depends(get_current_tailor_user), db: Session = Depends(get_db)):
    tailor = db.query(Tailor).filter(Tailor.user_id == current_user["user_id"]).first()
    if not tailor:
        tailor = Tailor(user_id=current_user["user_id"], **data.model_dump()); db.add(tailor)
    else:
        for key, value in data.model_dump().items(): setattr(tailor, key, value)
    db.commit(); db.refresh(tailor); return tailor
