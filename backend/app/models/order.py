"""Order and OrderItem models"""

from sqlalchemy import Column, String, DateTime, Boolean, Float, Integer, JSON, ForeignKey, Text, Enum, Uuid as UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.database import Base
import enum


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED = "returned"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class Order(Base):
    __tablename__ = "orders"

    # Basic Info
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Pricing
    total_amount = Column(Float, nullable=False)
    discount_applied = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    shipping_amount = Column(Float, default=0.0)
    final_amount = Column(Float, nullable=False)
    
    # Status
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING, index=True)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, index=True)
    
    # Shipping Info
    shipping_address = Column(JSON, nullable=True)
    tracking_number = Column(String, nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    customization_notes = Column(Text, nullable=True)
    
    # Dates
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    delivered_at = Column(DateTime, nullable=True)
    
    # Relationships
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    @property
    def items(self):
        """Public API name for the order line items."""
        return self.order_items

    def __repr__(self):
        return f"<Order {self.id}>"


class OrderItem(Base):
    __tablename__ = "order_items"

    # Basic Info
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    
    # Quantity & Pricing
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, nullable=False)
    
    # Purchase Type
    purchase_type = Column(String, default="buy")  # buy or rent
    
    # Item Details
    size = Column(String, nullable=True)
    color = Column(String, nullable=True)
    
    # Rental Dates (if rent)
    rental_start_date = Column(DateTime, nullable=True)
    rental_end_date = Column(DateTime, nullable=True)
    
    # Customization
    customization_details = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    order = relationship("Order", back_populates="order_items")

    def __repr__(self):
        return f"<OrderItem {self.id}>"
