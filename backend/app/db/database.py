"""Database configuration and session management"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from app.config import settings

# Determine database URL with fallback to SQLite if PostgreSQL fails or isn't running
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql") and "localhost" in db_url:
    # Try connecting to postgresql, fallback to sqlite if unavailable
    try:
        temp_engine = create_engine(db_url, connect_args={"connect_timeout": 2})
        with temp_engine.connect():
            pass
        temp_engine.dispose()
    except Exception:
        db_url = "sqlite:///./perfectfit.db"

# Create engine
engine = create_engine(
    db_url,
    echo=settings.DEBUG,
    poolclass=NullPool if settings.ENV == "testing" else None,
    connect_args={"check_same_thread": False} if "sqlite" in db_url else {}
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for models
Base = declarative_base()


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database - create all tables"""
    Base.metadata.create_all(bind=engine)


def drop_db():
    """Drop all tables - use with caution!"""
    Base.metadata.drop_all(bind=engine)
