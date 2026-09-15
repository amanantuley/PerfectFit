"""FastAPI application initialization for PerfectFit."""

import json
import logging
import os
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db.database import SessionLocal, engine
from app.models import Base
from app.models.product import Product


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
)

logger = logging.getLogger(__name__)


# ============================================================
# DATABASE INITIALIZATION + SEEDING
# ============================================================

def initialize_database():
    """
    Create database tables and seed initial products if required.
    """

    logger.info("Initializing PerfectFit database...")

    # --------------------------------------------------------
    # Create all database tables
    # --------------------------------------------------------

    Base.metadata.create_all(bind=engine)

    logger.info("✓ Database tables initialized")

    # --------------------------------------------------------
    # Seed products if products table is empty
    # --------------------------------------------------------

    db = SessionLocal()

    try:
        product_count = db.query(Product).count()

        logger.info(
            f"Products currently in database: {product_count}"
        )

        if product_count > 0:
            logger.info(
                "✓ Products already exist. Skipping product seeding."
            )
            return

        # ----------------------------------------------------
        # Locate perfectfit-db.json
        # ----------------------------------------------------

        json_path = os.path.abspath(
            os.path.join(
                os.path.dirname(__file__),
                "..",
                "..",
                "perfectfit-db.json",
            )
        )

        logger.info(
            f"Checking product seed file: {json_path}"
        )

        if not os.path.exists(json_path):
            logger.warning(
                "⚠ perfectfit-db.json not found. "
                "Skipping product seeding."
            )
            return

        # ----------------------------------------------------
        # Read JSON
        # ----------------------------------------------------

        with open(
            json_path,
            "r",
            encoding="utf-8",
        ) as file:
            data = json.load(file)

        products_data = data.get("products", [])

        if not products_data:
            logger.warning(
                "⚠ No products found in perfectfit-db.json."
            )
            return

        # ----------------------------------------------------
        # Insert products
        # ----------------------------------------------------

        seeded_count = 0

        for product_data in products_data:

            raw_id = product_data.get("id")

            # ------------------------------------------------
            # Convert ID to UUID
            # ------------------------------------------------

            try:
                product_id = uuid.UUID(str(raw_id))
            except (ValueError, TypeError, AttributeError):
                product_id = uuid.uuid5(
                    uuid.NAMESPACE_DNS,
                    str(raw_id),
                )

            # ------------------------------------------------
            # Handle rent price safely
            # ------------------------------------------------

            rent_price = product_data.get("rentPrice")

            if rent_price in ("", None):
                rent_price = None
            else:
                rent_price = float(rent_price)

            # ------------------------------------------------
            # Create product
            # ------------------------------------------------

            product = Product(
                id=product_id,
                name=product_data["name"],
                type=product_data["type"],
                description=product_data.get("description"),
                price=float(product_data["price"]),
                rent_price=rent_price,
                image_url=product_data.get("image"),
                data_ai_hint=product_data.get("dataAiHint"),
                stock_quantity=int(
                    product_data.get(
                        "stockQuantity",
                        100,
                    )
                ),
                rating=float(
                    product_data.get(
                        "rating",
                        5.0,
                    )
                ),
                review_count=int(
                    product_data.get(
                        "reviewCount",
                        0,
                    )
                ),
                in_stock=bool(
                    product_data.get(
                        "inStock",
                        True,
                    )
                ),
                is_active=True,
            )

            db.add(product)

            seeded_count += 1

        # ----------------------------------------------------
        # Commit all products
        # ----------------------------------------------------

        db.commit()

        logger.info(
            f"✓ Successfully seeded {seeded_count} products "
            "into PostgreSQL"
        )

    except Exception:
        db.rollback()

        logger.exception(
            "✗ Product seeding failed"
        )

        raise

    finally:
        db.close()


# ============================================================
# APPLICATION LIFESPAN
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown lifecycle.
    """

    # ========================================================
    # STARTUP
    # ========================================================

    logger.info(
        "=================================================="
    )

    logger.info(
        "Starting PerfectFit Backend..."
    )

    logger.info(
        f"Application: {settings.APP_NAME}"
    )

    logger.info(
        f"Version: {settings.APP_VERSION}"
    )

    try:

        initialize_database()

        logger.info(
            "✓ Database initialization completed successfully"
        )

    except Exception:

        logger.exception(
            "✗ Database initialization failed"
        )

        # Fail startup instead of running with a broken DB.
        raise

    logger.info(
        "✓ PerfectFit Backend startup completed"
    )

    logger.info(
        "=================================================="
    )

    # ========================================================
    # APPLICATION RUNNING
    # ========================================================

    yield

    # ========================================================
    # SHUTDOWN
    # ========================================================

    logger.info(
        "Shutting down PerfectFit Backend..."
    )

    logger.info(
        "PerfectFit Backend shutdown complete."
    )


# ============================================================
# CREATE FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Complete backend for PerfectFit - "
        "AI-powered tailoring platform"
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
)


# ============================================================
# CORS
# ============================================================

# CORS Middleware
origins = [o for o in settings.CORS_ORIGINS if o != "*"]
allow_origin_regex = r".*" if "*" in settings.CORS_ORIGINS else None

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_origin_regex=allow_origin_regex if origins else None,
    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ============================================================
# TRUSTED HOST
# ============================================================

app.add_middleware(
    TrustedHostMiddleware,

    allowed_hosts=[
        # Local development
        "localhost",
        "127.0.0.1",
        "testserver",

        # PerfectFit production domain
        "perfectfit-4quj.onrender.com",

        # Future custom PerfectFit domains
        "*.perfectfit.com",
    ],
)


# ============================================================
# GLOBAL EXCEPTION HANDLER
# ============================================================

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """
    Handle unexpected application exceptions.
    """

    logger.exception(
        f"Unhandled exception while processing "
        f"{request.method} {request.url.path}"
    )

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
        },
    )


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
async def root():
    """
    Root endpoint.
    """

    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "docs": "/docs",
        "health": "/health",
        "version": settings.APP_VERSION,
        "status": "running",
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
async def health_check():
    """
    Basic application health check.
    """

    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


# ============================================================
# API ROUTES
# ============================================================

from app.api.v1 import api_v1_router

app.include_router(
    api_v1_router
)


# ============================================================
# LOCAL DEVELOPMENT
# ============================================================

if __name__ == "__main__":

    import uvicorn

    # Render provides PORT automatically.
    # Local development falls back to 8000.
    port = int(
        os.getenv(
            "PORT",
            "8000",
        )
    )

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )