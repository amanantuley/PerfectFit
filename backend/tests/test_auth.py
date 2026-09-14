import pytest
from app.models import User
from conftest import auth_cookies_for


def test_register_user_success(client):
    """Verify user registration succeeds with correct schema and sets auth cookies."""
    payload = {
        "email": "newuser@example.com",
        "password": "Password123!",
        "first_name": "Alice",
        "last_name": "Wonder",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["first_name"] == "Alice"
    assert "password_hash" not in data  # Ensure password hash is not leaked
    assert "perfectfit_access" in response.cookies


def test_register_duplicate_email_rejected(client, customer_user):
    """Verify registration fails when email is already registered."""
    payload = {
        "email": customer_user.email,
        "password": "Password123!",
        "first_name": "Duplicate",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409  # UserAlreadyExistsError


def test_login_success(client, customer_user):
    """Verify login succeeds with valid credentials and returns tokens + cookies."""
    payload = {
        "email": customer_user.email,
        "password": "CustomerPass123!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "perfectfit_access" in response.cookies


def test_login_invalid_password_rejected(client, customer_user):
    """Verify login fails with wrong password."""
    payload = {
        "email": customer_user.email,
        "password": "WrongPassword!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401


def test_login_nonexistent_user_rejected(client):
    """Verify login fails for unknown user."""
    payload = {
        "email": "nobody@example.com",
        "password": "Password123!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401


def test_get_current_user_me(client, customer_user):
    """Verify GET /auth/me returns authenticated user data."""
    cookies = auth_cookies_for(customer_user)
    response = client.get("/api/v1/auth/me", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == customer_user.email
    assert data["id"] == str(customer_user.id)


def test_get_current_user_unauthorized(client):
    """Verify GET /auth/me fails when unauthenticated."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_logout(client, customer_user):
    """Verify logout clears auth cookies."""
    cookies = auth_cookies_for(customer_user)
    response = client.post("/api/v1/auth/logout", cookies=cookies)
    assert response.status_code == 200
    assert response.json()["message"] == "Successfully logged out"
