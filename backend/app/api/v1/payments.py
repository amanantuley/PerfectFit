"""Payment and Razorpay integration routes"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import Payment, Order, PaymentStatus, Subscription
from app.schemas.schemas import PaymentCreate, RazorpayVerify, PaymentResponse
from app.core.security import get_current_user
from app.core.exceptions import OrderNotFoundError, RazorpayVerificationError
from app.config import settings
from uuid import UUID
import razorpay
import hashlib
import hmac
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["Payments"])


def to_uuid(val):
    if val is None or isinstance(val, UUID):
        return val
    try:
        return UUID(str(val))
    except (ValueError, TypeError):
        return val


# Initialize Razorpay client
razorpay_client = razorpay.Client(
    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
)


@router.post("/razorpay/create-order")
async def create_razorpay_order(
    payment_create: PaymentCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create Razorpay order for either an order or subscription
    """
    user_id = current_user["user_id"]
    
    amount = None
    receipt = None
    
    if payment_create.order_id:
        order = db.query(Order).filter(
            Order.id == to_uuid(payment_create.order_id),
            Order.user_id == to_uuid(user_id)
        ).first()

        if not order:
            raise OrderNotFoundError()

        existing_payment = db.query(Payment).filter(
            Payment.order_id == to_uuid(payment_create.order_id),
            Payment.status == "completed"
        ).first()

        if existing_payment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order already paid"
            )
        
        amount = order.final_amount
        receipt = str(order.id)
        
    elif payment_create.subscription_id:
        subscription = db.query(Subscription).filter(
            Subscription.id == to_uuid(payment_create.subscription_id),
            Subscription.user_id == to_uuid(user_id)
        ).first()

        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found"
            )
        
        amount = subscription.price
        receipt = str(subscription.id)
        
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either order_id or subscription_id must be provided"
        )

    try:
        # Create Razorpay order
        razorpay_order = razorpay_client.order.create({
            "amount": int(amount * 100),  # Amount in paise
            "currency": "INR",
            "receipt": receipt,
            "payment_capture": 1,
            "notes": {
                "user_id": str(user_id),
                "order_id": str(payment_create.order_id) if payment_create.order_id else None,
                "subscription_id": str(payment_create.subscription_id) if payment_create.subscription_id else None,
                "email": current_user.get("payload", {}).get("email"),
            }
        })

        payment = db.query(Payment).filter(
            Payment.razorpay_order_id == razorpay_order["id"]
        ).first()
        
        if not payment:
            payment = Payment(
                order_id=to_uuid(payment_create.order_id),
                subscription_id=to_uuid(payment_create.subscription_id),
                user_id=to_uuid(user_id),
                amount=amount,
                currency="INR",
                payment_method=payment_create.payment_method,
                razorpay_order_id=razorpay_order["id"],
                status="pending"
            )
            db.add(payment)
        else:
            payment.status = "pending"

        db.commit()
        db.refresh(payment)

        logger.info(f"✓ Razorpay order created: {razorpay_order['id']}")

        return {
            "razorpay_order_id": razorpay_order["id"],
            "amount": amount,
            "currency": "INR",
            "key_id": settings.RAZORPAY_KEY_ID,
            "payment_id": str(payment.id),
        }

    except Exception as e:
        logger.error(f"✗ Razorpay order creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create payment order"
        )


@router.post("/razorpay/verify")
async def verify_razorpay_payment(
    payment_verify: RazorpayVerify,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify Razorpay payment signature and update order/subscription state transactionally
    """
    try:
        payment = db.query(Payment).filter(
            Payment.razorpay_order_id == payment_verify.razorpay_order_id,
            Payment.user_id == to_uuid(current_user["user_id"])
        ).first()

        if not payment:
            raise RazorpayVerificationError()

        # Verify signature
        generated_signature = hmac.new(
            key=settings.RAZORPAY_KEY_SECRET.encode(),
            msg=f"{payment_verify.razorpay_order_id}|{payment_verify.razorpay_payment_id}".encode(),
            digestmod=hashlib.sha256
        ).hexdigest()

        if generated_signature != payment_verify.razorpay_signature:
            logger.warning(f"✗ Payment verification failed for order {payment_verify.razorpay_order_id}")
            raise RazorpayVerificationError()

        # Update payment status
        payment.status = "completed"
        payment.razorpay_payment_id = payment_verify.razorpay_payment_id
        payment.razorpay_signature = payment_verify.razorpay_signature

        if payment.order_id:
            order = db.query(Order).filter(Order.id == to_uuid(payment.order_id)).first()
            if order:
                order.payment_status = PaymentStatus.COMPLETED
                order.status = "processing"
                logger.info(f"✓ Order payment verified for order {payment.order_id}")
        
        if payment.subscription_id:
            subscription = db.query(Subscription).filter(Subscription.id == to_uuid(payment.subscription_id)).first()
            if subscription:
                subscription.status = "active"
                logger.info(f"✓ Subscription payment verified for subscription {payment.subscription_id}")

        db.commit()

        return {
            "status": "success",
            "message": "Payment verified successfully",
            "payment_id": str(payment.id),
            "razorpay_payment_id": payment_verify.razorpay_payment_id,
        }

    except RazorpayVerificationError:
        raise
    except Exception as e:
        logger.error(f"✗ Payment verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment verification failed"
        )


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id == current_user["user_id"]
    ).first()

    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    return payment


@router.post("/{payment_id}/refund")
async def refund_payment(
    payment_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id == current_user["user_id"]
    ).first()

    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    if payment.status != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only refund completed payments")

    try:
        refund = razorpay_client.payment.refund(
            payment.razorpay_payment_id,
            {"amount": int(payment.amount * 100), "notes": {"payment_id": str(payment.id)}}
        )
        payment.status = "refunded"
        db.commit()
        return {"status": "success", "message": "Refund processed successfully", "refund_id": refund["id"]}
    except Exception as e:
        logger.error(f"✗ Refund processing failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Refund processing failed")


@router.post("/razorpay/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Secure Razorpay webhook endpoint with signature verification & idempotent event processing.
    """
    raw_body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature")

    if settings.RAZORPAY_WEBHOOK_SECRET and signature:
        expected_sig = hmac.new(
            key=settings.RAZORPAY_WEBHOOK_SECRET.encode(),
            msg=raw_body,
            digestmod=hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(expected_sig, signature):
            logger.warning("✗ Invalid Razorpay webhook signature")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature")

    request_data = await request.json()
    event = request_data.get("event")
    payload = request_data.get("payload", {})

    logger.info(f"Received verified Razorpay webhook: {event}")

    try:
        if event in ["payment.authorized", "payment.captured"]:
            payment_entity = payload.get("payment", {}).get("entity", {})
            rzp_order_id = payment_entity.get("order_id")
            rzp_payment_id = payment_entity.get("id")

            if rzp_order_id:
                payment = db.query(Payment).filter(Payment.razorpay_order_id == rzp_order_id).first()
                if payment and payment.status != "completed":
                    payment.status = "completed"
                    payment.razorpay_payment_id = rzp_payment_id
                    if payment.order_id:
                        order = db.query(Order).filter(Order.id == payment.order_id).first()
                        if order:
                            order.payment_status = PaymentStatus.COMPLETED
                            order.status = "processing"
                    if payment.subscription_id:
                        sub = db.query(Subscription).filter(Subscription.id == payment.subscription_id).first()
                        if sub:
                            sub.status = "active"
                    db.commit()

        elif event == "payment.failed":
            payment_entity = payload.get("payment", {}).get("entity", {})
            rzp_order_id = payment_entity.get("order_id")
            if rzp_order_id:
                payment = db.query(Payment).filter(Payment.razorpay_order_id == rzp_order_id).first()
                if payment:
                    payment.status = "failed"
                    if payment.order_id:
                        order = db.query(Order).filter(Order.id == payment.order_id).first()
                        if order:
                            order.payment_status = PaymentStatus.FAILED
                    db.commit()

        return {"status": "received"}

    except Exception as e:
        logger.error(f"✗ Webhook processing error: {e}")
        return {"status": "error", "message": str(e)}
