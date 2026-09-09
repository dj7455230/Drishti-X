"""
DRISHTI-X — FastAPI Application Entry Point
See the Evidence. Explain the Risk. Connect Rural India.
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.base import Base, engine
from app.api.routes import auth, patients, screenings, dashboard

# ----------------------------------------------------------------
# Startup / Shutdown
# ----------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup (use Alembic migrations in production)
    Base.metadata.create_all(bind=engine)

    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.MODEL_DIR, exist_ok=True)

    # Log model status at startup
    print("=" * 60)
    print(f"  DRISHTI-X v{settings.APP_VERSION}")
    print(f"  Environment: {settings.APP_ENV}")
    print(f"  Model Status: {settings.MODEL_STATUS}")
    if settings.DEMO_MODE:
        print("  ⚠️  DEMO MODE ACTIVE — No trained model loaded")
        print("  ⚠️  SYNTHETIC DEMONSTRATION DATA")
    if not settings.MATLAB_AVAILABLE:
        print("  ℹ️  MATLAB ENGINE UNAVAILABLE — Python fallback active")
    print("=" * 60)

    yield
    # Cleanup on shutdown (if needed)


# ----------------------------------------------------------------
# Application
# ----------------------------------------------------------------
app = FastAPI(
    title="DRISHTI-X API",
    description=(
        "Explainable AI for Diabetic Retinopathy Screening in Rural India. "
        "AI-ASSISTED SCREENING — NOT A FINAL MEDICAL DIAGNOSIS."
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ----------------------------------------------------------------
# CORS
# ----------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------------
# Static Files (uploaded images, Grad-CAMs, etc.)
# ----------------------------------------------------------------
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ----------------------------------------------------------------
# Routes
# ----------------------------------------------------------------
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(screenings.router)
app.include_router(dashboard.router)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "model_status": settings.MODEL_STATUS,
        "demo_mode": settings.DEMO_MODE,
        "matlab_available": settings.MATLAB_AVAILABLE,
        "disclaimer": "AI-ASSISTED SCREENING — NOT A FINAL MEDICAL DIAGNOSIS",
    }
