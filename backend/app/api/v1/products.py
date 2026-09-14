"""Product management routes"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db.database import get_db
from app.models import Product
from app.schemas.schemas import ProductResponse, ProductCreate, ProductUpdate
from app.core.security import get_current_user, get_current_admin_user
from app.core.exceptions import ProductNotFoundError
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/products", tags=["Products"])


def to_uuid(val):
    if val is None or isinstance(val, UUID):
        return val
    try:
        return UUID(str(val))
    except (ValueError, TypeError):
        return val



@router.get("", response_model=List[ProductResponse])
async def get_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    product_type: str = Query(None),
    search: str = Query(None),
    min_price: float = Query(None, ge=0),
    max_price: float = Query(None, ge=0),
    in_stock_only: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Get products with filtering and pagination
    
    - **skip**: Number of products to skip
    - **limit**: Number of products to return
    - **product_type**: Filter by type (shirt, suit, jeans, etc.)
    - **search**: Search by name or description
    - **min_price**: Minimum price filter
    - **max_price**: Maximum price filter
    - **in_stock_only**: Only return in-stock products
    """
    query = db.query(Product).filter(Product.is_active == True)

    # Apply filters
    if product_type:
        query = query.filter(Product.type == product_type)

    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%")) |
            (Product.description.ilike(f"%{search}%"))
        )

    if min_price is not None:
        query = query.filter(Product.price >= min_price)

    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    if in_stock_only:
        query = query.filter(Product.in_stock == True)

    # Get total count and paginate
    total = query.count()
    products = query.offset(skip).limit(limit).all()

    return products


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    db: Session = Depends(get_db)
):
    """Get product by ID"""
    product = db.query(Product).filter(Product.id == to_uuid(product_id)).first()

    if not product or not product.is_active:
        raise ProductNotFoundError()

    return product


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product: ProductCreate,
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create new product (Admin only)"""
    db_product = Product(
        **product.dict(),
        created_by=current_user["user_id"],
    )

    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    logger.info(f"✓ Product created: {product.name}")
    return db_product


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_update: ProductUpdate,
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update product (Admin only)"""
    db_product = db.query(Product).filter(Product.id == to_uuid(product_id)).first()

    if not db_product:
        raise ProductNotFoundError()

    # Update fields
    update_data = product_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_product, field, value)

    db.commit()
    db.refresh(db_product)

    logger.info(f"✓ Product updated: {db_product.name}")
    return db_product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete product (Admin only)"""
    product = db.query(Product).filter(Product.id == to_uuid(product_id)).first()

    if not product:
        raise ProductNotFoundError()

    # Soft delete
    product.is_active = False
    db.commit()

    logger.info(f"✓ Product deleted: {product.name}")
    return None


@router.get("/{product_id}/details", response_model=ProductResponse)
async def get_product_details(
    product_id: str,
    db: Session = Depends(get_db)
):
    """Get detailed product information"""
    product = db.query(Product).filter(Product.id == to_uuid(product_id)).first()

    if not product or not product.is_active:
        raise ProductNotFoundError()

    return product


@router.post("/{product_id}/rating")
async def rate_product(
    product_id: str,
    rating: float = Query(..., ge=1, le=5),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rate a product"""
    product = db.query(Product).filter(Product.id == to_uuid(product_id)).first()

    if not product:
        raise ProductNotFoundError()

    # Keep the aggregate on Product.  A separate reviews table can be introduced
    # later without changing this public endpoint.
    product.rating = round(((product.rating * product.review_count) + rating) / (product.review_count + 1), 2)
    product.review_count += 1
    db.commit()

    return {"message": "Product rated successfully"}
