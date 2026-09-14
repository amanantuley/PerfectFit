"""Product/Garment model"""

from sqlalchemy import Column, String, DateTime, Boolean, Float, Integer, JSON, ForeignKey, Text, Uuid as UUID
from datetime import datetime
import uuid
from app.db.database import Base


class Product(Base):
    __tablename__ = "products"

    # Basic Info
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    type = Column(String(50), nullable=False, index=True)  # shirt, suit, jeans, etc.
    description = Column(Text, nullable=True)
    
    # Pricing
    price = Column(Float, nullable=False)  # Buy price
    rent_price = Column(Float, nullable=True)  # Rent price
    
    # Media
    image_url = Column(String, nullable=True)
    additional_images = Column(JSON, nullable=True)  # Array of image URLs
    
    # AI Hint
    data_ai_hint = Column(String, nullable=True)  # For ML model training
    
    # Inventory & Sizing
    available_sizes = Column(JSON, nullable=True)  # ["XS", "S", "M", "L", "XL"]
    available_colors = Column(JSON, nullable=True)  # ["Black", "White", "Blue"]
    stock_quantity = Column(Integer, default=0)
    
    # Ratings & Reviews
    rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    
    # Status
    in_stock = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    
    # Seller Info (if created by a tailor)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Metadata
    tags = Column(JSON, nullable=True)  # ["casual", "formal", "wedding"]
    sku = Column(String(100), unique=True, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Product {self.name}>"
