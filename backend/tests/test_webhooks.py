import json
import hashlib
import hmac
import pytest
from app.config import settings
from conftest import auth_cookies_for

SAMPLE_ADDRESS = {"street": "123 Main St", "city": "NY", "state": "NY", "postal_code": "10001"}


def test_valid_webhook_signature_accepted(client, customer_user, sample_product, monkeypatch):
    """Verify valid webhook payload with HMAC-SHA256 signature updates payment state."""
    cookies = auth_cookies_for(customer_user)

    monkeypatch.setattr("app.api.v1.payments.razorpay_client.order.create", lambda data: {
        "id": "order_rzp_webhook_100",
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

    webhook_payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_wh_12345",
                    "order_id": "order_rzp_webhook_100",
                    "amount": 105000,
                    "status": "captured"
                }
            }
        }
    }
    raw_body = json.dumps(webhook_payload).encode()
    signature = hmac.new(
        key=settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        msg=raw_body,
        digestmod=hashlib.sha256
    ).hexdigest()

    headers = {"X-Razorpay-Signature": signature, "Content-Type": "application/json"}
    response = client.post("/api/v1/payments/razorpay/webhook", content=raw_body, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "received"

    # Order should be marked completed
    order_check = client.get(f"/api/v1/orders/{order_id}", cookies=cookies)
    assert order_check.json()["payment_status"] == "completed"


def test_invalid_webhook_signature_rejected(client):
    """Verify webhook with invalid signature is rejected with HTTP 400."""
    webhook_payload = {"event": "payment.captured", "payload": {}}
    raw_body = json.dumps(webhook_payload).encode()
    headers = {"X-Razorpay-Signature": "invalid_webhook_signature_hash", "Content-Type": "application/json"}

    response = client.post("/api/v1/payments/razorpay/webhook", content=raw_body, headers=headers)
    assert response.status_code == 400
    assert "Invalid webhook signature" in response.json()["detail"]


def test_duplicate_webhook_event_idempotency(client, customer_user, sample_product, monkeypatch):
    """Verify duplicate webhook delivery does not fail or duplicate side effects."""
    cookies = auth_cookies_for(customer_user)

    monkeypatch.setattr("app.api.v1.payments.razorpay_client.order.create", lambda data: {
        "id": "order_rzp_idempotent_200",
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

    webhook_payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_wh_dup_999",
                    "order_id": "order_rzp_idempotent_200",
                    "amount": 105000,
                    "status": "captured"
                }
            }
        }
    }
    raw_body = json.dumps(webhook_payload).encode()
    signature = hmac.new(
        key=settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        msg=raw_body,
        digestmod=hashlib.sha256
    ).hexdigest()

    headers = {"X-Razorpay-Signature": signature, "Content-Type": "application/json"}

    # First webhook delivery
    resp1 = client.post("/api/v1/payments/razorpay/webhook", content=raw_body, headers=headers)
    assert resp1.status_code == 200

    # Second (duplicate) webhook delivery
    resp2 = client.post("/api/v1/payments/razorpay/webhook", content=raw_body, headers=headers)
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "received"
