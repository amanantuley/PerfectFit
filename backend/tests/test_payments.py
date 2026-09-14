import hashlib
import hmac
import pytest
from app.config import settings
from conftest import auth_cookies_for

SAMPLE_ADDRESS = {"street": "123 Main St", "city": "NY", "state": "NY", "postal_code": "10001"}


def test_create_razorpay_order_for_order(client, customer_user, sample_product, monkeypatch):
    """Verify Razorpay order creation creates payment record in pending state."""
    cookies = auth_cookies_for(customer_user)

    # Mock Razorpay client response
    def mock_order_create(data):
        return {
            "id": "order_rzp_mock_12345",
            "amount": data["amount"],
            "currency": "INR",
            "receipt": data["receipt"]
        }
    from app.api.v1.payments import razorpay_client
    monkeypatch.setattr(razorpay_client.order, "create", mock_order_create)

    # Create order first
    order_resp = client.post("/api/v1/orders", json={
        "items": [{"product_id": str(sample_product.id), "quantity": 1, "purchase_type": "buy"}],
        "shipping_address": SAMPLE_ADDRESS
    }, cookies=cookies)
    order_id = order_resp.json()["id"]

    # Create Razorpay order
    payment_resp = client.post("/api/v1/payments/razorpay/create-order", json={
        "order_id": order_id,
        "payment_method": "razorpay"
    }, cookies=cookies)

    assert payment_resp.status_code == 200
    data = payment_resp.json()
    assert data["razorpay_order_id"] == "order_rzp_mock_12345"
    assert data["currency"] == "INR"


def test_verify_razorpay_payment_valid_signature(client, customer_user, sample_product, monkeypatch):
    """Verify valid Razorpay HMAC signature updates order payment status to completed."""
    cookies = auth_cookies_for(customer_user)

    monkeypatch.setattr("app.api.v1.payments.razorpay_client.order.create", lambda data: {
        "id": "order_rzp_mock_99999",
        "amount": data["amount"],
        "currency": "INR",
        "receipt": data["receipt"]
    })

    order_resp = client.post("/api/v1/orders", json={
        "items": [{"product_id": str(sample_product.id), "quantity": 1, "purchase_type": "buy"}],
        "shipping_address": SAMPLE_ADDRESS
    }, cookies=cookies)
    order_id = order_resp.json()["id"]

    client.post("/api/v1/payments/razorpay/create-order", json={
        "order_id": order_id,
        "payment_method": "razorpay"
    }, cookies=cookies)

    rzp_order_id = "order_rzp_mock_99999"
    rzp_payment_id = "pay_mock_77777"
    
    # Compute valid signature
    valid_sig = hmac.new(
        key=settings.RAZORPAY_KEY_SECRET.encode(),
        msg=f"{rzp_order_id}|{rzp_payment_id}".encode(),
        digestmod=hashlib.sha256
    ).hexdigest()

    verify_resp = client.post("/api/v1/payments/razorpay/verify", json={
        "razorpay_order_id": rzp_order_id,
        "razorpay_payment_id": rzp_payment_id,
        "razorpay_signature": valid_sig
    }, cookies=cookies)

    assert verify_resp.status_code == 200
    assert verify_resp.json()["status"] == "success"

    # Check order payment status updated
    order_check = client.get(f"/api/v1/orders/{order_id}", cookies=cookies)
    assert order_check.json()["payment_status"] == "completed"


def test_verify_razorpay_payment_invalid_signature_rejected(client, customer_user, sample_product, monkeypatch):
    """Verify invalid Razorpay signature is rejected with HTTP 400."""
    cookies = auth_cookies_for(customer_user)

    monkeypatch.setattr("app.api.v1.payments.razorpay_client.order.create", lambda data: {
        "id": "order_rzp_mock_bad_sig",
        "amount": data["amount"],
        "currency": "INR",
        "receipt": data["receipt"]
    })

    order_resp = client.post("/api/v1/orders", json={
        "items": [{"product_id": str(sample_product.id), "quantity": 1, "purchase_type": "buy"}],
        "shipping_address": SAMPLE_ADDRESS
    }, cookies=cookies)
    order_id = order_resp.json()["id"]

    client.post("/api/v1/payments/razorpay/create-order", json={
        "order_id": order_id,
        "payment_method": "razorpay"
    }, cookies=cookies)

    # Send forged signature
    verify_resp = client.post("/api/v1/payments/razorpay/verify", json={
        "razorpay_order_id": "order_rzp_mock_bad_sig",
        "razorpay_payment_id": "pay_mock_forged",
        "razorpay_signature": "invalid_forged_signature_hash"
    }, cookies=cookies)

    assert verify_resp.status_code == 400
