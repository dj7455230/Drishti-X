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
from app.api.routes import simulation, reports

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

    # Pre-load model at startup so health endpoint is accurate immediately
    weights_path = os.path.join(settings.MODEL_DIR, "best_model.pth")
    try:
        from ai.classification.model import get_model_loader
        loader = get_model_loader(
            weights_path=weights_path if os.path.exists(weights_path) else None
        )
        actual_status = loader.status
        is_demo = not loader.is_ready_for_real_inference()
    except Exception as e:
        actual_status = "NOT_TRAINED"
        is_demo = True
        print(f"[Startup] Model loader warning: {e}")

    print("=" * 60)
    print(f"  DRISHTI-X v{settings.APP_VERSION}")
    print(f"  Environment: {settings.APP_ENV}")
    print(f"  Model Status: {actual_status}")
    print(f"  Demo Mode:    {is_demo}")
    if is_demo:
        print("  ⚠  DEMO MODE ACTIVE — No trained model loaded")
    else:
        print("  ✓  REAL MODEL ACTIVE — EfficientNet-B0 trained weights loaded")
    if not settings.MATLAB_AVAILABLE:
        print("  ℹ  MATLAB ENGINE UNAVAILABLE — Python fallback active")
    print("=" * 60)

    yield


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
app.include_router(simulation.router)
app.include_router(reports.router)


@app.get("/api/health")
def health_check():
    """Live health check — reads actual model loader status."""
    import os

    weights_path      = os.path.join(settings.MODEL_DIR, "best_model.pth")
    unet_weights_path = os.path.join(settings.MODEL_DIR, "unet_lesion.pth")
    weights_exist      = os.path.exists(weights_path)
    unet_weights_exist = os.path.exists(unet_weights_path)

    live_model_status = settings.MODEL_STATUS
    live_demo_mode    = settings.DEMO_MODE

    try:
        from ai.classification.model import _loader
        if _loader is not None:
            live_model_status = _loader.status
            live_demo_mode    = not _loader.is_ready_for_real_inference()
        elif weights_exist:
            live_model_status = "TRAINED"
            live_demo_mode    = False
    except Exception:
        pass

    # U-Net status
    unet_status = "NOT_TRAINED"
    try:
        if unet_weights_exist:
            import torch
            ckpt = torch.load(unet_weights_path, map_location="cpu", weights_only=False)
            unet_status = ckpt.get("status", "TRAINED")
    except Exception:
        unet_status = "TRAINED" if unet_weights_exist else "NOT_TRAINED"

    return {
        "status":                "ok",
        "app":                   settings.APP_NAME,
        "version":               settings.APP_VERSION,
        "model_status":          live_model_status,
        "unet_status":           unet_status,
        "demo_mode":             live_demo_mode,
        "weights_available":     weights_exist,
        "unet_weights_available": unet_weights_exist,
        "matlab_available":      settings.MATLAB_AVAILABLE,
        "disclaimer":            "AI-ASSISTED SCREENING — NOT A FINAL MEDICAL DIAGNOSIS",
    }
