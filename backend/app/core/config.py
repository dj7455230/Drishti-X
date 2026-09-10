"""
DRISHTI-X — Core Configuration
Loads from environment variables / .env file.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=["backend/.env", ".env"],
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
    APP_NAME: str = "DRISHTI-X"
    APP_VERSION: str = "0.1.0"
    APP_ENV: str = "development"          # development | production | demo
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = "CHANGE_THIS_IN_PRODUCTION_USE_openssl_rand_hex_32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/drishti_x"

    # File Storage
    UPLOAD_DIR: str = "uploads"
    MAX_IMAGE_SIZE_MB: int = 20
    ALLOWED_IMAGE_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".tiff", ".bmp"]

    # Model
    MODEL_DIR: str = "models/weights"
    MODEL_STATUS: str = "NOT_TRAINED"   # NOT_TRAINED | TRAINED | VALIDATED | DEMO
    DEMO_MODE: bool = True               # Forced True until real model is trained

    # MATLAB
    MATLAB_AVAILABLE: bool = False
    MATLAB_ENGINE_PATH: str = ""

    # AI Pipeline
    DEVICE: str = "cpu"                  # cpu | cuda | mps
    BATCH_SIZE: int = 8
    IMAGE_SIZE: int = 224
    NUM_CLASSES: int = 5                 # DR Grade 0-4

    # Thresholds
    MIN_QUALITY_SCORE: float = 0.5       # Below this → RECAPTURE REQUIRED
    MIN_CONFIDENCE_FOR_VALIDATION: float = 0.75
    MISMATCH_THRESHOLD: float = 0.3      # Evidence vs prediction divergence

    # Referral
    REFERABLE_GRADES: List[int] = [2, 3, 4]  # Grade 2+ = Referable DR

    # Application


settings = Settings()
