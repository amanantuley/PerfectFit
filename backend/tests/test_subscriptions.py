import hashlib
import hmac
import pytest
from app.config import settings
from conftest import auth_cookies_for


def test_create_subscription_server_side_pricing(client, customer_user):
    """Verify backend enforces fixed plan pricing (basic=199, premium=499, vip=999)."""
    cookies = auth_cookies_for(customer_user)

    # Basic plan
    resp = client.post("/api/v1/subscriptions", json={"plan_type": "basic"}, cookies=cookies)
    assert resp.status_code == 201
    data = resp.json()
    assert data["price"] == 199.0
    assert data["status"] == "pending"

    # Premium plan
    resp_prem = client.post("/api/v1/subscriptions", json={"plan_type": "premium"}, cookies=cookies)
    assert resp_prem.status_code == 201
    assert resp_prem.json()["price"] == 499.0


def test_create_invalid_subscription_plan_rejected(client, customer_user):
    """Verify unknown subscription plan is rejected."""
    cookies = auth_cookies_for(customer_user)
    resp = client.post("/api/v1/subscriptions", json={"plan_type": "invalid_plan"}, cookies=cookies)
    assert resp.status_code == 400


def test_subscription_payment_verification_activates_plan(client, customer_user, monkeypatch):
    """Verify successful Razorpay verification activates subscription."""
    cookies = auth_cookies_for(customer_user)

    # Create subscription
    sub_resp = client.post("/api/v1/subscriptions", json={"plan_type": "vip"}, cookies=cookies)
    sub_id = sub_resp.json()["id"]

    monkeypatch.setattr("app.api.v1.payments.razorpay_client.order.create", lambda data: {
        "id": "order_rzp_sub_100",
        "amount": data["amount"],
        "currency": "INR",
        "receipt": data["receipt"]
    })

    # Create Razorpay order for subscription
    client.post("/api/v1/payments/razorpay/create-order", json={
        "subscription_id": sub_id,
        "payment_method": "razorpay"
    }, cookies=cookies)

    rzp_order_id = "order_rzp_sub_100"
    rzp_payment_id = "pay_sub_555"

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

    # Subscription status should now be active
    subs_list = client.get("/api/v1/subscriptions", cookies=cookies)
    assert subs_list.json()[0]["status"] == "active"


def test_failed_subscription_payment_does_not_activate(client, customer_user, monkeypatch):
    """Verify subscription remains pending/failed if payment verification fails."""
    cookies = auth_cookies_for(customer_user)

    sub_resp = client.post("/api/v1/subscriptions", json={"plan_type": "basic"}, cookies=cookies)
    sub_id = sub_resp.json()["id"]

    monkeypatch.setattr("app.api.v1.payments.razorpay_client.order.create", lambda data: {
        "id": "order_rzp_sub_failed",
        "amount": data["amount"],
        "currency": "INR",
        "receipt": data["receipt"]
    })

    client.post("/api/v1/payments/razorpay/create-order", json={
        "subscription_id": sub_id,
        "payment_method": "razorpay"
    }, cookies=cookies)

    # Fail signature verification
    client.post("/api/v1/payments/razorpay/verify", json={
        "razorpay_order_id": "order_rzp_sub_failed",
        "razorpay_payment_id": "pay_sub_fake",
        "razorpay_signature": "bad_sig"
    }, cookies=cookies)

    subs_list = client.get("/api/v1/subscriptions", cookies=cookies)
    assert subs_list.json()[0]["status"] != "active"
