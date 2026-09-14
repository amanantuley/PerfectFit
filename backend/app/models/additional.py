"""Additional models: Payment, Measurement, Message, Reward, Wallet"""

from sqlalchemy import Column, String, DateTime, Boolean, Float, Integer, JSON, ForeignKey, Text, Enum, Uuid as UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.database import Base
import enum


# ===================== PAYMENT MODEL =====================
class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Amount
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    
    # Payment Method
    payment_method = Column(String, default="razorpay")  # razorpay, wallet, card, etc.
    
    # Razorpay Details
    razorpay_payment_id = Column(String, nullable=True, unique=True)
    razorpay_order_id = Column(String, nullable=True)
    razorpay_signature = Column(String, nullable=True)
    
    # Status
    status = Column(String, default="pending")  # pending, completed, failed
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Payment {self.id}>"


# ===================== MEASUREMENT MODEL =====================
class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Image
    image_url = Column(String, nullable=False)
    
    # Measurements (in cm)
    chest = Column(Float, nullable=True)
    waist = Column(Float, nullable=True)
    hip = Column(Float, nullable=True)
    shoulder = Column(Float, nullable=True)
    inseam = Column(Float, nullable=True)
    sleeve_length = Column(Float, nullable=True)
    neck = Column(Float, nullable=True)
    
    # ML Model Info
    confidence_score = Column(Float, default=0.0)  # 0-1 score
    model_version = Column(String, nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    def __repr__(self):
        return f"<Measurement {self.id}>"


# ===================== MESSAGE MODEL =====================
class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    receiver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Content
    content = Column(Text, nullable=False)
    message_type = Column(String, default="text")  # text, order_update, notification
    
    # Attachments
    attachments = Column(JSON, nullable=True)  # Array of file URLs
    
    # Status
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    def __repr__(self):
        return f"<Message {self.id}>"


# ===================== REWARD MODEL =====================
class Reward(Base):
    __tablename__ = "rewards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    
    # Points
    points_earned = Column(Integer, default=0)
    points_used = Column(Integer, default=0)
    current_balance = Column(Integer, default=0)
    
    # Tier
    tier = Column(String, default="bronze")  # bronze, silver, gold, platinum
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Reward {self.user_id}>"


# ===================== WALLET MODEL =====================
class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    
    # Balance
    balance = Column(Float, default=0.0)
    currency = Column(String, default="INR")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Wallet {self.user_id}>"


# ===================== TRANSACTION MODEL =====================
class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_id = Column(UUID(as_uuid=True), ForeignKey("wallets.id"), nullable=False)
    
    # Amount
    amount = Column(Float, nullable=False)
    transaction_type = Column(String)  # credit, debit
    
    # Reference
    description = Column(String, nullable=True)
    reference_id = Column(UUID(as_uuid=True), nullable=True)  # order_id or payment_id
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Transaction {self.id}>"


# ===================== SUBSCRIPTION MODEL =====================
class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Plan
    plan_type = Column(String)  # basic, premium, vip
    price = Column(Float, nullable=False)
    
    # Status
    status = Column(String, default="active")  # active, cancelled, expired
    auto_renew = Column(Boolean, default=True)
    
    # Dates
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    renewal_date = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Subscription {self.id}>"


# ===================== RETURN MODEL =====================
class ReturnRequest(Base):
    __tablename__ = "return_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Details
    reason = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # Status
    status = Column(String, default="requested")  # requested, approved, rejected, shipped_back, completed
    
    # Refund
    refund_amount = Column(Float, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    approved_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)

    def __repr__(self):
        return f"<ReturnRequest {self.id}>"


# ===================== NOTIFICATION MODEL =====================
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Content
    notification_type = Column(String)  # order_update, message, reward, promotion
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    
    # Data (for routing/action)
    data = Column(JSON, nullable=True)
    
    # Status
    is_read = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<Notification {self.id}>"


# ===================== TAILOR MODEL =====================
class Tailor(Base):
    __tablename__ = "tailors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    
    # Shop Info
    shop_name = Column(String, nullable=False)
    shop_image = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    
    # Specialization
    specialization = Column(JSON, nullable=True)  # ["suits", "casual", "formal"]
    
    # Status
    verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Ratings
    rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    
    # Location
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    
    # Working Hours
    availability = Column(JSON, nullable=True)  # {monday: {open: "9:00", close: "18:00"}}
    
    # Pricing
    price_range = Column(JSON, nullable=True)  # {min: 100, max: 5000}
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Tailor {self.shop_name}>"
