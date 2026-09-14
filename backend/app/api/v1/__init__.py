"""API v1 routes"""

from fastapi import APIRouter
from app.api.v1 import auth, users, products, orders, payments, platform

# Create API v1 router
api_v1_router = APIRouter(prefix="/api/v1")

# Include route modules
api_v1_router.include_router(auth.router)
api_v1_router.include_router(users.router)
api_v1_router.include_router(products.router)
api_v1_router.include_router(orders.router)
api_v1_router.include_router(payments.router)
api_v1_router.include_router(platform.router)

__all__ = ["api_v1_router"]
