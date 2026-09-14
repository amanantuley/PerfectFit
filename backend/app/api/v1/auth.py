"""Authentication routes"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import User, UserRole
from app.schemas.schemas import (
    UserCreate,
    UserResponse,
    LoginRequest,
    TokenResponse,
    PasswordReset,
    TokenRefreshRequest,
)
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
    get_current_user,
)
from app.core.exceptions import (
    UserNotFoundError,
    UserAlreadyExistsError,
    InvalidCredentialsError,
)
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new user
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise UserAlreadyExistsError(user_data.email)

    # Create new user
    db_user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        gender=user_data.gender,
        address=user_data.address,
        city=user_data.city,
        state=user_data.state,
        postal_code=user_data.postal_code,
        country=user_data.country,
        preferred_style=user_data.preferred_style,
        auth_provider="email",
        role=UserRole.CUSTOMER,
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    logger.info(f"✓ User registered successfully: {user_data.email}")
    return db_user


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login user with email and password
    """
    # Find user
    user = db.query(User).filter(User.email == credentials.email).first()

    # Verify credentials
    if not user or not verify_password(credentials.password, user.password_hash):
        logger.warning(f"✗ Failed login attempt for: {credentials.email}")
        raise InvalidCredentialsError()

    # Check if account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    # Create tokens
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
        }
    )
    refresh_token = create_refresh_token(
        data={
            "sub": str(user.id),
            "email": user.email,
        }
    )

    # Update last login
    user.last_login = __import__('datetime').datetime.utcnow()
    db.commit()

    logger.info(f"✓ User logged in: {credentials.email}")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token_endpoint(refresh_data: TokenRefreshRequest):
    """
    Refresh access token using refresh token
    """
    try:
        token = refresh_data.token
        payload = verify_token(token, token_type="refresh")
        user_id = payload.get("sub")
        email = payload.get("email")

        # Create new access token
        new_access_token = create_access_token(
            data={
                "sub": user_id,
                "email": email,
            }
        )

        logger.info(f"✓ Token refreshed for user: {email}")

        return {
            "access_token": new_access_token,
            "refresh_token": token,
            "token_type": "bearer",
        }
    except Exception as e:
        logger.error(f"✗ Token refresh failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout user (token-based, so just return success)
    """
    logger.info(f"✓ User logged out: {current_user['payload'].get('email')}")
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current authenticated user info
    """
    user = db.query(User).filter(User.id == current_user["user_id"]).first()

    if not user:
        raise UserNotFoundError()

    return user


@router.post("/forgot-password")
async def forgot_password(email: str, db: Session = Depends(get_db)):
    """
    Request password reset
    """
    user = db.query(User).filter(User.email == email).first()

    # Always return success for security reasons
    if user:
        # Generate reset token
        reset_token = create_access_token(
            data={"sub": str(user.id), "type": "password_reset"},
            expires_delta=timedelta(hours=1)
        )

        logger.info(f"✓ Password reset requested for: {email}")

        # TODO: Send reset email with token
        # await send_password_reset_email(email, reset_token)

        return {
            "message": "If an account with that email exists, a password reset link has been sent",
            "reset_token": reset_token  # In production, send this via email only
        }

    return {
        "message": "If an account with that email exists, a password reset link has been sent"
    }


@router.post("/reset-password")
async def reset_password(
    reset_data: PasswordReset,
    db: Session = Depends(get_db)
):
    """
    Reset password using token
    """
    try:
        payload = verify_token(reset_data.token, token_type="access")

        if payload.get("type") != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token"
            )

        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise UserNotFoundError()

        # Update password
        user.password_hash = hash_password(reset_data.new_password)
        db.commit()

        logger.info(f"✓ Password reset successful for: {user.email}")

        return {"message": "Password reset successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ Password reset failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )


@router.get("/verify-email/{token}")
async def verify_email(token: str, db: Session = Depends(get_db)):
    """
    Verify email address
    """
    try:
        payload = verify_token(token)
        user_id = payload.get("sub")

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise UserNotFoundError()

        user.is_verified = True
        db.commit()

        logger.info(f"✓ Email verified for: {user.email}")

        return {"message": "Email verified successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ Email verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
