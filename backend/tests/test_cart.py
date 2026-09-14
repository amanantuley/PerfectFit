import pytest
from conftest import auth_cookies_for


def test_add_item_to_cart_success(client, customer_user, sample_product):
    """Verify authenticated user can add item to cart."""
    cookies = auth_cookies_for(customer_user)
    payload = {
        "product_id": str(sample_product.id),
        "quantity": 2,
        "purchase_type": "buy",
        "size": "M",
        "color": "Navy",
    }
    response = client.post("/api/v1/cart/items", json=payload, cookies=cookies)
    assert response.status_code == 201
    data = response.json()
    assert data["product_id"] == str(sample_product.id)
    assert data["quantity"] == 2
    assert data["purchase_type"] == "buy"


def test_get_cart_items(client, customer_user, sample_product):
    """Verify fetching user's cart returns added items."""
    cookies = auth_cookies_for(customer_user)
    client.post("/api/v1/cart/items", json={
        "product_id": str(sample_product.id),
        "quantity": 1,
        "purchase_type": "buy"
    }, cookies=cookies)

    response = client.get("/api/v1/cart", cookies=cookies)
    assert response.status_code == 200
    cart_data = response.json()
    assert len(cart_data["items"]) == 1
    assert cart_data["items"][0]["product_id"] == str(sample_product.id)


def test_unauthenticated_cart_access_rejected(client, sample_product):
    """Verify unauthenticated request to cart endpoints returns 401."""
    response = client.get("/api/v1/cart")
    assert response.status_code == 401

    payload = {
        "product_id": str(sample_product.id),
        "quantity": 1,
        "purchase_type": "buy",
    }
    response = client.post("/api/v1/cart/items", json=payload)
    assert response.status_code == 401


def test_add_nonexistent_product_rejected(client, customer_user):
    """Verify adding non-existent product ID returns 404."""
    cookies = auth_cookies_for(customer_user)
    payload = {
        "product_id": "00000000-0000-0000-0000-000000000000",
        "quantity": 1,
        "purchase_type": "buy",
    }
    response = client.post("/api/v1/cart/items", json=payload, cookies=cookies)
    assert response.status_code == 404


def test_cart_insufficient_stock_rejected(client, customer_user, sample_product):
    """Verify adding more items than available in stock returns 400."""
    cookies = auth_cookies_for(customer_user)
    payload = {
        "product_id": str(sample_product.id),
        "quantity": sample_product.stock_quantity + 5,  # Exceed stock
        "purchase_type": "buy",
    }
    response = client.post("/api/v1/cart/items", json=payload, cookies=cookies)
    assert response.status_code == 400
    assert "Insufficient stock" in response.json()["detail"]


def test_update_cart_item(client, customer_user, sample_product):
    """Verify updating cart item quantity."""
    cookies = auth_cookies_for(customer_user)
    add_resp = client.post("/api/v1/cart/items", json={
        "product_id": str(sample_product.id),
        "quantity": 1,
        "purchase_type": "buy"
    }, cookies=cookies)
    item_id = add_resp.json()["id"]

    update_resp = client.put(f"/api/v1/cart/items/{item_id}", json={"quantity": 4}, cookies=cookies)
    assert update_resp.status_code == 200
    assert update_resp.json()["quantity"] == 4


def test_remove_cart_item(client, customer_user, sample_product):
    """Verify deleting a single item from cart."""
    cookies = auth_cookies_for(customer_user)
    add_resp = client.post("/api/v1/cart/items", json={
        "product_id": str(sample_product.id),
        "quantity": 1,
        "purchase_type": "buy"
    }, cookies=cookies)
    item_id = add_resp.json()["id"]

    del_resp = client.delete(f"/api/v1/cart/items/{item_id}", cookies=cookies)
    assert del_resp.status_code == 204

    get_resp = client.get("/api/v1/cart", cookies=cookies)
    assert len(get_resp.json()["items"]) == 0


def test_clear_entire_cart(client, customer_user, sample_product):
    """Verify clearing entire cart."""
    cookies = auth_cookies_for(customer_user)
    client.post("/api/v1/cart/items", json={
        "product_id": str(sample_product.id),
        "quantity": 2,
        "purchase_type": "buy"
    }, cookies=cookies)

    clear_resp = client.delete("/api/v1/cart", cookies=cookies)
    assert clear_resp.status_code == 204

    get_resp = client.get("/api/v1/cart", cookies=cookies)
    assert len(get_resp.json()["items"]) == 0


def test_cart_user_isolation_idor(client, customer_user, customer_user_2, sample_product):
    """Verify Customer 2 cannot update or delete Customer 1's cart item."""
    cookies1 = auth_cookies_for(customer_user)
    cookies2 = auth_cookies_for(customer_user_2)

    add_resp = client.post("/api/v1/cart/items", json={
        "product_id": str(sample_product.id),
        "quantity": 1,
        "purchase_type": "buy"
    }, cookies=cookies1)
    item_id = add_resp.json()["id"]

    # Customer 2 attempts to modify Customer 1's item
    update_resp = client.put(f"/api/v1/cart/items/{item_id}", json={"quantity": 5}, cookies=cookies2)
    assert update_resp.status_code == 404

    del_resp = client.delete(f"/api/v1/cart/items/{item_id}", cookies=cookies2)
    assert del_resp.status_code == 404
