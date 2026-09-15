from typing import List
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings and configuration"""

    # ===== APP CONFIG =====
    APP_NAME: str = "PerfectFit Backend"
    APP_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENV: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # ===== DATABASE =====
    DATABASE_URL: str = "sqlite:///./perfectfit.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # ===== JWT & SECURITY =====
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ===== RAZORPAY =====
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = "rzp_webhook_secret_key"

    # ===== EMAIL =====
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 465
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM_NAME: str = "PerfectFit Team"
    SMTP_FROM_EMAIL: str = "noreply@perfectfit.com"

    # ===== GOOGLE OAUTH =====
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    # ===== FILE STORAGE =====
    UPLOAD_DIR: str = "uploads/"
    TEMP_DIR: str = "temp/"
    MAX_FILE_SIZE: int = 10485760  # 10MB
    ALLOWED_FILE_TYPES: List[str] = ["jpg", "jpeg", "png", "gif", "webp"]

    # ===== AWS S3 (Optional for Production) =====
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET_NAME: str = ""
    AWS_S3_REGION: str = "us-east-1"

    # ===== FRONTEND & CORS =====
    FRONTEND_URL: str = "http://localhost:9002"
    CORS_ORIGINS: List[str] = [
        "http://localhost:9002",
        "http://localhost:3000",
        "http://localhost:8000",
        "https://perfectfit-ai.vercel.app",
    ]

    # ===== CELERY =====
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # ===== ML MODELS =====
    MODEL_PATH: str = "models/body_measurement_model.pkl"
    CONFIDENCE_THRESHOLD: float = 0.75

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()
