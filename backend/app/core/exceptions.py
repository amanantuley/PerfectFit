"""Custom exception classes"""

from fastapi import HTTPException, status


class PerfectFitException(Exception):
    """Base exception for PerfectFit app"""
    pass


class UserNotFoundError(HTTPException):
    """User not found exception"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )


class UserAlreadyExistsError(HTTPException):
    """User already exists exception"""
    def __init__(self, email: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with email {email} already exists"
        )


class InvalidCredentialsError(HTTPException):
    """Invalid credentials exception"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )


class UnauthorizedError(HTTPException):
    """Unauthorized access exception"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )


class ForbiddenError(HTTPException):
    """Forbidden access exception"""
    def __init__(self, detail: str = "Access forbidden"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


class ProductNotFoundError(HTTPException):
    """Product not found exception"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )


class OrderNotFoundError(HTTPException):
    """Order not found exception"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )


class InsufficientStockError(HTTPException):
    """Insufficient stock exception"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient stock available"
        )


class PaymentFailedError(HTTPException):
    """Payment failed exception"""
    def __init__(self, detail: str = "Payment failed"):
        super().__init__(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=detail
        )


class RazorpayVerificationError(HTTPException):
    """Razorpay verification error"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed"
        )


class InvalidFileError(HTTPException):
    """Invalid file exception"""
    def __init__(self, detail: str = "Invalid file"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )


class ValidationError(HTTPException):
    """Validation error exception"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail
        )


class InternalServerError(HTTPException):
    """Internal server error exception"""
    def __init__(self, detail: str = "Internal server error"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail
        )
