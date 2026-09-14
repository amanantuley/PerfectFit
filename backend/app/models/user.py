"""User model"""

from sqlalchemy import Column, String, DateTime, Boolean, Float, Integer, JSON, Enum, Uuid as UUID
from datetime import datetime
import uuid
from app.db.database import Base
import enum


class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    TAILOR = "tailor"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    # Basic Info
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, nullable=True)
    password_hash = Column(String, nullable=False)
    
    # Personal Info
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    profile_image_url = Column(String, nullable=True)
    gender = Column(String, nullable=True)  # male, female, other
    date_of_birth = Column(DateTime, nullable=True)
    
    # Address
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    country = Column(String, default="India")
    
    # Measurements (stored as JSON)
    measurements = Column(JSON, nullable=True)  # {chest, waist, hip, shoulder, inseam, sleeve}
    
    # Preferences
    preferred_style = Column(JSON, nullable=True)  # array of style preferences
    
    # Authentication
    auth_provider = Column(String, default="email")  # email, google, etc.
    is_verified = Column(Boolean, default=False)
    
    # Account Status
    is_active = Column(Boolean, default=True)
    role = Column(Enum(UserRole), default=UserRole.CUSTOMER)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)
    
    # Relationships will be added via foreign keys in related models

    def __repr__(self):
        return f"<User {self.email}>"
