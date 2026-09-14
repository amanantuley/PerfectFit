import pytest
from conftest import auth_cookies_for


def test_customer_cannot_access_tailor_profile_update(client, customer_user):
    """Verify customer role cannot access tailor profile update endpoint (HTTP 403)."""
    cookies = auth_cookies_for(customer_user)
    payload = {
        "bio": "I am a customer trying to hack tailor profile",
        "specialties": ["Suits"]
    }
    response = client.put("/api/v1/tailors/me", json=payload, cookies=cookies)
    assert response.status_code == 403
    assert "Only tailors can access this resource" in response.json()["detail"]


def test_tailor_can_access_tailor_profile_update(client, tailor_user):
    """Verify tailor user can access tailor profile update endpoint."""
    cookies = auth_cookies_for(tailor_user)
    payload = {
        "shop_name": "Bespoke Master Studio",
        "bio": "Expert bespoke tailor with 15 years experience",
        "specialization": ["Suits", "Sherwanis"],
        "phone": "9876543210"
    }
    response = client.put("/api/v1/tailors/me", json=payload, cookies=cookies)
    assert response.status_code == 200
    assert response.json()["shop_name"] == "Bespoke Master Studio"


def test_customer_measurement_isolation(client, customer_user, customer_user_2):
    """Verify Customer 2 cannot see Customer 1's measurements."""
    cookies1 = auth_cookies_for(customer_user)
    cookies2 = auth_cookies_for(customer_user_2)

    # Customer 1 creates measurement
    client.post("/api/v1/measurements", json={
        "chest": 100.0,
        "waist": 85.0,
        "shoulder": 46.0
    }, cookies=cookies1)

    # Customer 2 lists measurements
    resp2 = client.get("/api/v1/measurements", cookies=cookies2)
    assert resp2.status_code == 200
    assert len(resp2.json()) == 0


def test_customer_wallet_isolation(client, customer_user, customer_user_2):
    """Verify Customer 2 cannot read or spend Customer 1's wallet balance."""
    cookies1 = auth_cookies_for(customer_user)
    cookies2 = auth_cookies_for(customer_user_2)

    # Customer 1 adds money
    client.post("/api/v1/wallet/add-money", json={"amount": 500.0}, cookies=cookies1)

    # Customer 2 checks wallet balance
    resp2 = client.get("/api/v1/wallet", cookies=cookies2)
    assert resp2.status_code == 200
    assert resp2.json()["balance"] == 0.0


def test_customer_message_isolation(client, customer_user, customer_user_2, tailor_user):
    """Verify message isolation between users."""
    cookies1 = auth_cookies_for(customer_user)
    cookies2 = auth_cookies_for(customer_user_2)

    # Customer 1 sends message to Tailor
    client.post("/api/v1/messages", json={
        "receiver_id": str(tailor_user.id),
        "content": "Hello tailor from customer 1"
    }, cookies=cookies1)

    # Customer 2 lists messages
    resp2 = client.get("/api/v1/messages", cookies=cookies2)
    assert resp2.status_code == 200
    assert len(resp2.json()) == 0
