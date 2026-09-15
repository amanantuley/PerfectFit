"""FastAPI application initialization"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.config import settings
from app.db.database import init_db, engine
from app.models import Base
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Initialize database on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown"""
    # Startup
    logger.info("Starting up PerfectFit Backend...")
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("✓ Database initialized")

        # Auto-seed initial products if products table is empty
        from app.db.database import SessionLocal
        from app.models.product import Product
        import json, os, uuid

        db = SessionLocal()
        try:
            if db.query(Product).count() == 0:
                json_path = os.path.join(os.path.dirname(__file__), "..", "..", "perfectfit-db.json")
                if os.path.exists(json_path):
                    with open(json_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    products_data = data.get("products", [])
                    for p in products_data:
                        raw_id = p.get("id")
                        try:
                            prod_id = uuid.UUID(raw_id)
                        except Exception:
                            prod_id = uuid.uuid5(uuid.NAMESPACE_DNS, str(raw_id))

                        prod = Product(
                            id=prod_id,
                            name=p["name"],
                            type=p["type"],
                            description=p.get("description"),
                            price=float(p["price"]),
                            rent_price=float(p["rentPrice"]) if p.get("rentPrice") else None,
                            image_url=p.get("image"),
                            data_ai_hint=p.get("dataAiHint"),
                            stock_quantity=100,
                            rating=float(p.get("rating", 5.0)),
                            review_count=int(p.get("reviewCount", 0)),
                            in_stock=bool(p.get("inStock", True)),
                            is_active=True,
                        )
                        db.add(prod)
                    db.commit()
                    logger.info(f"✓ Seeded {len(products_data)} products into database")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"✗ Database initialization or seeding failed: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down PerfectFit Backend...")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Complete backend for PerfectFit - AI-powered tailoring platform",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)


# ===================== MIDDLEWARE =====================

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted Host Middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "localhost",
        "127.0.0.1",
        "testserver",
        "*.perfectfit.com",
        "*.onrender.com",
    ],
)



# ===================== EXCEPTION HANDLERS =====================

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# ===================== HEALTH CHECK =====================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "docs": "/docs",
        "version": settings.APP_VERSION,
    }


# ===================== API ROUTES =====================

from app.api.v1 import api_v1_router

app.include_router(api_v1_router)


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
