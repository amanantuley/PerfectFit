"""Order management routes"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime
from app.db.database import get_db
from app.models import Order, OrderItem, Product, OrderStatus, PaymentStatus
from app.schemas.schemas import OrderCreate, OrderResponse, OrderItemCreate
from app.core.security import get_current_user, get_current_tailor_user
from app.core.exceptions import OrderNotFoundError, ProductNotFoundError, InsufficientStockError
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_create: OrderCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new order
    
    Steps:
    1. Validate all products exist and have sufficient stock
    2. Create order with items
    3. Reduce stock (optional, can be done after payment)
    """
    user_id = current_user["user_id"]

    # Validate and calculate totals
    total_amount = 0
    order_items_data = []

    for item_create in order_create.items:
        # Get product
        product = db.query(Product).filter(Product.id == item_create.product_id).first()

        if not product:
            raise ProductNotFoundError()

        # Check stock (for non-rental items or available rental count)
        if item_create.purchase_type == "buy":
            if product.stock_quantity < item_create.quantity:
                raise InsufficientStockError()

        # Calculate price
        if item_create.purchase_type == "buy":
            unit_price = product.price
        else:
            unit_price = product.rent_price or product.price

        item_total = unit_price * item_create.quantity
        total_amount += item_total

        order_items_data.append({
            "product": product,
            "create_data": item_create,
            "unit_price": unit_price,
        })

    # Calculate tax and shipping (placeholder logic)
    tax_amount = total_amount * 0.05  # 5% tax
    shipping_amount = 50.0 if total_amount < 500 else 0.0
    final_amount = total_amount + tax_amount + shipping_amount

    # Create order
    db_order = Order(
        user_id=user_id,
        total_amount=total_amount,
        tax_amount=tax_amount,
        shipping_amount=shipping_amount,
        final_amount=final_amount,
        status=OrderStatus.PENDING,
        payment_status=PaymentStatus.PENDING,
        shipping_address=order_create.shipping_address,
        customization_notes=order_create.customization_notes,
    )

    db.add(db_order)
    db.flush()  # Get order ID without committing

    # Create order items
    for item_data in order_items_data:
        order_item = OrderItem(
            order_id=db_order.id,
            product_id=item_data["create_data"].product_id,
            quantity=item_data["create_data"].quantity,
            unit_price=item_data["unit_price"],
            purchase_type=item_data["create_data"].purchase_type,
            size=item_data["create_data"].size,
            color=item_data["create_data"].color,
            customization_details=item_data["create_data"].customization_details,
            rental_start_date=item_data["create_data"].rental_start_date,
            rental_end_date=item_data["create_data"].rental_end_date,
        )

        db.add(order_item)
        # Reserve stock at checkout so two customers cannot purchase the same item.
        if item_data["create_data"].purchase_type == "buy":
            product = item_data["product"]
            product.stock_quantity -= item_data["create_data"].quantity
            product.in_stock = product.stock_quantity > 0

    db.commit()
    db.refresh(db_order)

    logger.info(f"✓ Order created: {db_order.id} for user {user_id}")

    # TODO: Trigger email notification task
    # from app.tasks.celery_app import send_order_confirmation
    # send_order_confirmation.delay(str(db_order.id), user.email)

    return db_order


@router.get("", response_model=List[OrderResponse])
async def get_user_orders(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all orders for current user"""
    orders = db.query(Order).filter(
        Order.user_id == current_user["user_id"]
    ).order_by(Order.created_at.desc()).all()

    return orders


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get order details"""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user["user_id"]
    ).first()

    if not order:
        raise OrderNotFoundError()

    return order


@router.put("/{order_id}/status")
async def update_order_status(
    order_id: str,
    new_status: str,
    current_user: dict = Depends(get_current_tailor_user),
    db: Session = Depends(get_db)
):
    """Update order status (Admin/Tailor)"""
    # In a real app, check if user is admin or tailor who owns this order

    order = db.query(Order).filter(Order.id == order_id).first()

    if not order:
        raise OrderNotFoundError()

    # Validate status
    try:
        order.status = OrderStatus[new_status.upper()]
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {new_status}"
        )

    if new_status.lower() == "delivered":
        order.delivered_at = datetime.utcnow()

    db.commit()

    logger.info(f"✓ Order {order_id} status updated to {new_status}")

    # TODO: Send notification
    return {"message": f"Order status updated to {new_status}"}


@router.get("/{order_id}/tracking")
async def get_order_tracking(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get order tracking information"""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user["user_id"]
    ).first()

    if not order:
        raise OrderNotFoundError()

    return {
        "order_id": str(order.id),
        "status": order.status.value,
        "tracking_number": order.tracking_number,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "delivered_at": order.delivered_at,
        "shipping_address": order.shipping_address,
    }


@router.post("/{order_id}/cancel")
async def cancel_order(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel order (if in pending status)"""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user["user_id"]
    ).first()

    if not order:
        raise OrderNotFoundError()

    if order.status != OrderStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only cancel pending orders"
        )

    order.status = OrderStatus.CANCELLED
    # Restore inventory reserved when the order was created.
    for item in order.order_items:
        if item.purchase_type == "buy":
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                product.stock_quantity += item.quantity
                product.in_stock = True
    db.commit()

    logger.info(f"✓ Order {order_id} cancelled")

    # TODO: Process refund if payment was made
    return {"message": "Order cancelled successfully"}
