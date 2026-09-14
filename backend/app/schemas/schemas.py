"""Pydantic schemas for API validation"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


# ===================== USER SCHEMAS =====================
class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = "India"
    preferred_style: Optional[List[str]] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    preferred_style: Optional[List[str]] = None


class UserResponse(UserBase):
    id: UUID
    profile_image_url: Optional[str] = None
    is_verified: bool
    is_active: bool
    role: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserDetail(UserResponse):
    measurements: Optional[Dict[str, float]] = None
    last_login: Optional[datetime] = None


# ===================== PRODUCT SCHEMAS =====================
class ProductBase(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    price: float
    rent_price: Optional[float] = None
    data_ai_hint: Optional[str] = None
    available_sizes: Optional[List[str]] = None
    available_colors: Optional[List[str]] = None
    stock_quantity: int = 0
    in_stock: bool = True
    tags: Optional[List[str]] = None


class ProductCreate(ProductBase):
    image_url: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    rent_price: Optional[float] = None
    stock_quantity: Optional[int] = None
    in_stock: Optional[bool] = None
    available_sizes: Optional[List[str]] = None
    available_colors: Optional[List[str]] = None


class ProductResponse(ProductBase):
    id: UUID
    image_url: Optional[str] = None
    rating: float
    review_count: int
    created_at: datetime

    class Config:
        from_attributes = True


# ===================== CART SCHEMAS =====================
class CartItemCreate(BaseModel):
    product_id: UUID
    quantity: int = 1
    purchase_type: str = "buy"
    size: Optional[str] = None
    color: Optional[str] = None
    customization_details: Optional[Dict[str, Any]] = None
    customization_notes: Optional[str] = None
    rental_start_date: Optional[datetime] = None
    rental_end_date: Optional[datetime] = None


class CartItemUpdate(BaseModel):
    quantity: Optional[int] = None
    size: Optional[str] = None
    color: Optional[str] = None
    customization_details: Optional[Dict[str, Any]] = None
    customization_notes: Optional[str] = None
    rental_start_date: Optional[datetime] = None
    rental_end_date: Optional[datetime] = None


class CartItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    quantity: int
    purchase_type: str
    size: Optional[str] = None
    color: Optional[str] = None
    customization_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CartResponse(BaseModel):
    id: UUID
    user_id: UUID
    items: List[CartItemResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ===================== ORDER SCHEMAS =====================
class OrderItemCreate(BaseModel):
    product_id: UUID
    quantity: int = 1
    purchase_type: str = "buy"
    size: Optional[str] = None
    color: Optional[str] = None
    customization_details: Optional[Dict[str, Any]] = None
    rental_start_date: Optional[datetime] = None
    rental_end_date: Optional[datetime] = None


class OrderItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    quantity: int
    unit_price: float
    purchase_type: str
    size: Optional[str] = None
    color: Optional[str] = None

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    shipping_address: Dict[str, str]
    customization_notes: Optional[str] = None


class OrderResponse(BaseModel):
    id: UUID
    user_id: UUID
    total_amount: float
    discount_applied: float = 0.0
    tax_amount: float = 0.0
    shipping_amount: float = 0.0
    final_amount: float
    status: str
    payment_status: str
    items: List[OrderItemResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ===================== PAYMENT SCHEMAS =====================
class PaymentCreate(BaseModel):
    order_id: Optional[UUID] = None
    subscription_id: Optional[UUID] = None
    payment_method: str = "razorpay"


class RazorpayVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentResponse(BaseModel):
    id: UUID
    order_id: Optional[UUID] = None
    subscription_id: Optional[UUID] = None
    amount: float
    currency: str
    payment_method: str
    status: str
    razorpay_payment_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ===================== MEASUREMENT SCHEMAS =====================
class MeasurementCreate(BaseModel):
    image_url: str
    chest: Optional[float] = None
    waist: Optional[float] = None
    hip: Optional[float] = None
    shoulder: Optional[float] = None
    inseam: Optional[float] = None
    sleeve_length: Optional[float] = None
    neck: Optional[float] = None
    notes: Optional[str] = None


class MeasurementResponse(BaseModel):
    id: UUID
    user_id: UUID
    image_url: str
    chest: Optional[float] = None
    waist: Optional[float] = None
    hip: Optional[float] = None
    shoulder: Optional[float] = None
    inseam: Optional[float] = None
    sleeve_length: Optional[float] = None
    neck: Optional[float] = None
    confidence_score: float
    created_at: datetime

    class Config:
        from_attributes = True


# ===================== MESSAGE SCHEMAS =====================
class MessageCreate(BaseModel):
    receiver_id: UUID
    content: str
    message_type: str = "text"
    attachments: Optional[List[str]] = None


class MessageResponse(BaseModel):
    id: UUID
    sender_id: UUID
    receiver_id: UUID
    content: str
    message_type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ===================== REWARD SCHEMAS =====================
class RewardResponse(BaseModel):
    id: UUID
    user_id: UUID
    points_earned: int
    points_used: int
    current_balance: int
    tier: str

    class Config:
        from_attributes = True


# ===================== WALLET SCHEMAS =====================
class WalletAddMoney(BaseModel):
    amount: float


class WalletResponse(BaseModel):
    id: UUID
    user_id: UUID
    balance: float
    currency: str
    updated_at: datetime

    class Config:
        from_attributes = True


class TransactionResponse(BaseModel):
    id: UUID
    wallet_id: UUID
    amount: float
    transaction_type: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ===================== TAILOR SCHEMAS =====================
class TailorBase(BaseModel):
    shop_name: str
    bio: Optional[str] = None
    specialization: Optional[List[str]] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    availability: Optional[Dict[str, Any]] = None
    price_range: Optional[Dict[str, float]] = None


class TailorCreate(TailorBase):
    pass


class TailorResponse(TailorBase):
    id: UUID
    user_id: UUID
    verified: bool
    rating: float
    review_count: int
    created_at: datetime

    class Config:
        from_attributes = True


# ===================== RETURN SCHEMAS =====================
class ReturnRequestCreate(BaseModel):
    order_id: UUID
    reason: str
    description: Optional[str] = None


class ReturnRequestResponse(BaseModel):
    id: UUID
    order_id: UUID
    user_id: UUID
    reason: str
    status: str
    refund_amount: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ===================== SUBSCRIPTION SCHEMAS =====================
class SubscriptionPlan(BaseModel):
    plan_type: str
    price: float
    features: List[str]


class SubscriptionCreate(BaseModel):
    plan_type: str


class SubscriptionResponse(BaseModel):
    id: UUID
    user_id: UUID
    plan_type: str
    status: str
    start_date: datetime
    end_date: datetime
    auto_renew: bool

    class Config:
        from_attributes = True


# ===================== NOTIFICATION SCHEMAS =====================
class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    notification_type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ===================== AUTH SCHEMAS =====================
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenRefreshRequest(BaseModel):
    token: str


class PasswordReset(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


# ===================== AI SCHEMAS =====================
class ExtractMeasurementsRequest(BaseModel):
    image_url: str


class FitRecommendationRequest(BaseModel):
    measurement_id: Optional[UUID] = None
    product_id: Optional[UUID] = None
