"""Cart management routes"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db.database import get_db
from app.models import Cart, CartItem, Product
from app.schemas.schemas import CartItemCreate, CartItemUpdate, CartItemResponse, CartResponse
from app.core.security import get_current_user
from app.core.exceptions import ProductNotFoundError
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cart", tags=["Cart"])


def get_or_create_cart(user_id: UUID, db: Session) -> Cart:
    """Get existing cart or create a new one"""
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if not cart:
        cart = Cart(user_id=user_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


@router.get("", response_model=CartResponse)
async def get_cart(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's cart with all items"""
    user_id = current_user["user_id"]
    
    cart = get_or_create_cart(user_id, db)
    db.refresh(cart)
    
    return cart


@router.post("/items", response_model=CartItemResponse, status_code=status.HTTP_201_CREATED)
async def add_to_cart(
    item_create: CartItemCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add item to cart"""
    user_id = current_user["user_id"]
    
    # Verify product exists
    product = db.query(Product).filter(Product.id == item_create.product_id).first()
    if not product:
        raise ProductNotFoundError()
    
    # Check stock for buy items
    if item_create.purchase_type == "buy":
        if product.stock_quantity < item_create.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock. Available: {product.stock_quantity}, Requested: {item_create.quantity}"
            )
    
    # Get or create cart
    cart = get_or_create_cart(user_id, db)
    
    # Check if item already in cart (same product, size, color)
    existing_item = db.query(CartItem).filter(
        CartItem.cart_id == cart.id,
        CartItem.product_id == item_create.product_id,
        CartItem.size == item_create.size,
        CartItem.color == item_create.color,
        CartItem.purchase_type == item_create.purchase_type,
    ).first()
    
    if existing_item:
        # Update quantity instead of adding duplicate
        existing_item.quantity += item_create.quantity
        db.add(existing_item)
        db.commit()
        db.refresh(existing_item)
        logger.info(f"✓ Updated cart item: {existing_item.id} for user {user_id}")
        return existing_item
    
    # Create new cart item
    cart_item = CartItem(
        cart_id=cart.id,
        product_id=item_create.product_id,
        quantity=item_create.quantity,
        purchase_type=item_create.purchase_type,
        size=item_create.size,
        color=item_create.color,
        customization_details=item_create.customization_details,
        customization_notes=item_create.customization_notes,
        rental_start_date=item_create.rental_start_date,
        rental_end_date=item_create.rental_end_date,
    )
    
    db.add(cart_item)
    db.commit()
    db.refresh(cart_item)
    
    logger.info(f"✓ Added to cart: {cart_item.id} for user {user_id}")
    return cart_item


@router.put("/items/{item_id}", response_model=CartItemResponse)
async def update_cart_item(
    item_id: str,
    item_update: CartItemUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update cart item"""
    user_id = current_user["user_id"]
    
    # Get cart
    cart = get_or_create_cart(user_id, db)
    
    # Get cart item
    try:
        target_item_id = UUID(item_id) if isinstance(item_id, str) else item_id
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")

    cart_item = db.query(CartItem).filter(
        CartItem.id == target_item_id,
        CartItem.cart_id == cart.id
    ).first()
    
    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found"
        )
    
    # Check stock if quantity changed
    if item_update.quantity is not None and item_update.quantity != cart_item.quantity:
        product = db.query(Product).filter(Product.id == cart_item.product_id).first()
        if cart_item.purchase_type == "buy" and product.stock_quantity < item_update.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock. Available: {product.stock_quantity}, Requested: {item_update.quantity}"
            )
    
    # Update fields
    if item_update.quantity is not None:
        cart_item.quantity = item_update.quantity
    if item_update.size is not None:
        cart_item.size = item_update.size
    if item_update.color is not None:
        cart_item.color = item_update.color
    if item_update.customization_details is not None:
        cart_item.customization_details = item_update.customization_details
    if item_update.customization_notes is not None:
        cart_item.customization_notes = item_update.customization_notes
    if item_update.rental_start_date is not None:
        cart_item.rental_start_date = item_update.rental_start_date
    if item_update.rental_end_date is not None:
        cart_item.rental_end_date = item_update.rental_end_date
    
    db.commit()
    db.refresh(cart_item)
    
    logger.info(f"✓ Updated cart item: {cart_item.id}")
    return cart_item


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_cart(
    item_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove item from cart"""
    user_id = current_user["user_id"]
    
    # Get cart
    cart = get_or_create_cart(user_id, db)
    
    # Get cart item
    try:
        target_item_id = UUID(item_id) if isinstance(item_id, str) else item_id
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")

    cart_item = db.query(CartItem).filter(
        CartItem.id == target_item_id,
        CartItem.cart_id == cart.id
    ).first()
    
    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found"
        )
    
    db.delete(cart_item)
    db.commit()
    
    logger.info(f"✓ Removed from cart: {item_id}")


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def clear_cart(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear entire cart"""
    user_id = current_user["user_id"]
    
    # Get cart
    cart = get_or_create_cart(user_id, db)
    
    # Delete all items
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.commit()
    
    logger.info(f"✓ Cleared cart for user {user_id}")
