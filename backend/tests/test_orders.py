import pytest
from conftest import auth_cookies_for

SAMPLE_ADDRESS = {
    "street": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "postal_code": "10001",
    "country": "USA"
}


def test_create_order_success(client, customer_user, sample_product):
    """Verify order creation calculates total, tax, and shipping on backend."""
    cookies = auth_cookies_for(customer_user)
    initial_stock = sample_product.stock_quantity

    order_payload = {
        "items": [
            {
                "product_id": str(sample_product.id),
                "quantity": 2,
                "purchase_type": "buy",
                "size": "L"
            }
        ],
        "shipping_address": SAMPLE_ADDRESS,
        "customization_notes": "Slim fit waist"
    }

    response = client.post("/api/v1/orders", json=order_payload, cookies=cookies)
    assert response.status_code == 201
    data = response.json()

    # Product price = 1000.0, qty = 2 -> total_amount = 2000.0
    # tax = 5% of 2000.0 = 100.0
    # shipping = 0.0 (total >= 500)
    # final_amount = 2100.0
    assert data["total_amount"] == 2000.0
    assert data["tax_amount"] == 100.0
    assert data["shipping_amount"] == 0.0
    assert data["final_amount"] == 2100.0
    assert len(data["items"]) == 1
    assert data["items"][0]["unit_price"] == 1000.0

    # Verify inventory was deducted
    prod_resp = client.get(f"/api/v1/products/{sample_product.id}")
    assert prod_resp.json()["stock_quantity"] == initial_stock - 2


def test_create_order_insufficient_stock_rejected(client, customer_user, sample_product):
    """Verify order creation fails if requested quantity exceeds stock."""
    cookies = auth_cookies_for(customer_user)
    order_payload = {
        "items": [
            {
                "product_id": str(sample_product.id),
                "quantity": sample_product.stock_quantity + 10,
                "purchase_type": "buy"
            }
        ],
        "shipping_address": SAMPLE_ADDRESS
    }
    response = client.post("/api/v1/orders", json=order_payload, cookies=cookies)
    assert response.status_code == 400


def test_get_user_orders(client, customer_user, sample_product):
    """Verify retrieving list of user's orders."""
    cookies = auth_cookies_for(customer_user)
    client.post("/api/v1/orders", json={
        "items": [{"product_id": str(sample_product.id), "quantity": 1, "purchase_type": "buy"}],
        "shipping_address": SAMPLE_ADDRESS
    }, cookies=cookies)

    response = client.get("/api/v1/orders", cookies=cookies)
    assert response.status_code == 200
    orders = response.json()
    assert len(orders) == 1


def test_order_user_isolation_idor(client, customer_user, customer_user_2, sample_product):
    """Verify Customer 2 cannot read Customer 1's order details."""
    cookies1 = auth_cookies_for(customer_user)
    cookies2 = auth_cookies_for(customer_user_2)

    order_resp = client.post("/api/v1/orders", json={
        "items": [{"product_id": str(sample_product.id), "quantity": 1, "purchase_type": "buy"}],
        "shipping_address": SAMPLE_ADDRESS
    }, cookies=cookies1)
    order_id = order_resp.json()["id"]

    # Customer 2 attempts to fetch Customer 1's order
    response = client.get(f"/api/v1/orders/{order_id}", cookies=cookies2)
    assert response.status_code == 404


def test_cancel_order_restores_stock(client, customer_user, sample_product):
    """Verify canceling a pending order restores inventory."""
    cookies = auth_cookies_for(customer_user)
    initial_stock = sample_product.stock_quantity

    order_resp = client.post("/api/v1/orders", json={
        "items": [{"product_id": str(sample_product.id), "quantity": 3, "purchase_type": "buy"}],
        "shipping_address": SAMPLE_ADDRESS
    }, cookies=cookies)
    order_id = order_resp.json()["id"]

    cancel_resp = client.post(f"/api/v1/orders/{order_id}/cancel", cookies=cookies)
    assert cancel_resp.status_code == 200

    # Stock should be restored
    prod_resp = client.get(f"/api/v1/products/{sample_product.id}")
    assert prod_resp.json()["stock_quantity"] == initial_stock
