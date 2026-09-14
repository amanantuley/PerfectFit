"""User management routes"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pathlib import Path
from uuid import uuid4
from app.config import settings
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import User
from app.schemas.schemas import UserResponse, UserDetail, UserUpdate
from app.core.security import get_current_user
from app.core.exceptions import UserNotFoundError
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserDetail)
async def get_current_user_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user profile"""
    user = db.query(User).filter(User.id == current_user["user_id"]).first()

    if not user:
        raise UserNotFoundError()

    return user


@router.put("/me", response_model=UserDetail)
async def update_current_user_profile(
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    user = db.query(User).filter(User.id == current_user["user_id"]).first()

    if not user:
        raise UserNotFoundError()

    # Update fields
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    logger.info(f"✓ User profile updated: {user.email}")
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get user by ID (public profile)"""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise UserNotFoundError()

    return user


@router.delete("/me")
async def delete_current_user(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete current user account"""
    user = db.query(User).filter(User.id == current_user["user_id"]).first()

    if not user:
        raise UserNotFoundError()

    # Soft delete
    user.is_active = False
    db.commit()

    logger.info(f"✓ User account deleted: {user.email}")
    return {"message": "Account deleted successfully"}


@router.get("/{user_id}/measurements", response_model=list)
async def get_user_measurements(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get user's measurements history"""
    from app.models import Measurement

    measurements = db.query(Measurement).filter(
        Measurement.user_id == user_id
    ).order_by(Measurement.created_at.desc()).all()

    return measurements


@router.post("/upload-profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and attach a profile picture to the current user."""
    user = db.query(User).filter(User.id == current_user["user_id"]).first()

    if not user:
        raise UserNotFoundError()

    extension = Path(file.filename or "").suffix.lower().lstrip(".")
    if extension not in settings.ALLOWED_FILE_TYPES:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Unsupported image type")

    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image exceeds maximum size")

    upload_dir = Path(settings.UPLOAD_DIR) / "profiles"
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4()}.{extension}"
    destination = upload_dir / filename
    destination.write_bytes(content)
    user.profile_image_url = f"/uploads/profiles/{filename}"
    db.commit()
    return {"message": "Profile picture uploaded successfully", "url": user.profile_image_url}
