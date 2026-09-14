import os
import sys
import pytest

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import Base, get_db
from app.models import User, UserRole, Product
from app.core.security import hash_password, create_access_token

# Isolated SQLite in-memory database for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh in-memory database schema for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI TestClient with overridden get_db dependency pointing to in-memory test DB."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def customer_user(db_session):
    user = User(
        email="customer@example.com",
        password_hash=hash_password("CustomerPass123!"),
        first_name="Jane",
        last_name="Doe",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def customer_user_2(db_session):
    user = User(
        email="customer2@example.com",
        password_hash=hash_password("CustomerPass123!"),
        first_name="John",
        last_name="Smith",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def tailor_user(db_session):
    user = User(
        email="tailor@example.com",
        password_hash=hash_password("TailorPass123!"),
        first_name="Master",
        last_name="Tailor",
        role=UserRole.TAILOR,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_user(db_session):
    user = User(
        email="admin@example.com",
        password_hash=hash_password("AdminPass123!"),
        first_name="Super",
        last_name="Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_product(db_session):
    product = Product(
        name="Tailored Italian Suit",
        type="suit",
        description="Premium wool suit",
        price=1000.0,
        rent_price=200.0,
        stock_quantity=10,
        in_stock=True,
        is_active=True,
        rating=4.8,
        review_count=12,
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


def auth_cookies_for(user: User) -> dict:
    """Helper to generate auth cookies for a user."""
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value}
    )
    return {"perfectfit_access": access_token}
