"""
DRISHTI-X — Dashboard Routes
GET /api/dashboard/statistics
GET /api/dashboard/referral-queue
GET /api/models
GET /api/metrics
GET /api/audit
"""
from typing import Annotated, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.base import get_db
from app.models.user import User
from app.models.patient import Patient
from app.models.screening import Screening, ScreeningStatus, ReferralPriority
from app.models.audit import AuditLog, ModelVersion
from app.api.deps import get_current_user, require_admin

router = APIRouter(prefix="/api", tags=["Dashboard"])


@router.get("/dashboard/statistics")
def get_statistics(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Overview statistics for the dashboard."""
    total_patients = db.query(func.count(Patient.id)).scalar()
    total_screenings = db.query(func.count(Screening.id)).scalar()
    pending = db.query(func.count(Screening.id)).filter(
        Screening.status == ScreeningStatus.PENDING
    ).scalar()
    critical = db.query(func.count(Screening.id)).filter(
        Screening.referral_priority == ReferralPriority.CRITICAL
    ).scalar()
    human_review = db.query(func.count(Screening.id)).filter(
        Screening.status == ScreeningStatus.HUMAN_REVIEW_REQUIRED
    ).scalar()
    recapture = db.query(func.count(Screening.id)).filter(
        Screening.status == ScreeningStatus.RECAPTURE_REQUIRED
    ).scalar()
    referable = db.query(func.count(Screening.id)).filter(
        Screening.is_referable == True
    ).scalar()

    return {
        "total_patients": total_patients,
        "total_screenings": total_screenings,
        "pending_screenings": pending,
        "critical_cases": critical,
        "human_review_required": human_review,
        "recapture_required": recapture,
        "referable_cases": referable,
        "model_status": "NOT_TRAINED",
        "disclaimer": "AI-ASSISTED SCREENING — NOT A FINAL MEDICAL DIAGNOSIS",
    }


@router.get("/dashboard/referral-queue")
def get_referral_queue(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    sort_by: str = Query("referral_score", enum=["referral_score", "created_at"]),
    limit: int = Query(50, ge=1, le=200),
):
    """Priority referral queue for ophthalmologist."""
    query = db.query(Screening).filter(
        Screening.is_referable == True,
        Screening.status != ScreeningStatus.REVIEWED
    )
    if sort_by == "referral_score":
        query = query.order_by(Screening.referral_score.desc().nullslast())
    else:
        query = query.order_by(Screening.created_at.desc())

    screenings = query.limit(limit).all()
    return [
        {
            "id": str(s.id),
            "patient_id": str(s.patient_id),
            "status": s.status.value,
            "referral_priority": s.referral_priority.value if s.referral_priority else None,
            "referral_score": s.referral_score,
            "created_at": s.created_at.isoformat(),
        }
        for s in screenings
    ]


@router.get("/models")
def list_models(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """List all model versions. Shows real status."""
    models = db.query(ModelVersion).all()
    if not models:
        return [
            {
                "model_name": "EfficientNet-B0",
                "version": "0.0.0",
                "architecture": "EfficientNet-B0 + Transfer Learning",
                "status": "NOT_TRAINED",
                "training_dataset": "NOT_AVAILABLE",
                "accuracy": None,
                "sensitivity": None,
                "specificity": None,
                "f1_score": None,
                "roc_auc": None,
                "metrics_note": "Not yet trained. Run training/train_efficientnet.py",
            }
        ]
    return models


@router.get("/audit")
def get_audit_logs(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """Audit trail — admin only."""
    logs = db.query(AuditLog).order_by(
        AuditLog.timestamp.desc()
    ).offset(skip).limit(limit).all()

    return [
        {
            "id": str(log.id),
            "user_id": str(log.user_id) if log.user_id else None,
            "screening_id": str(log.screening_id) if log.screening_id else None,
            "action": log.action,
            "user_role": log.user_role,
            "detail": log.detail,
            "model_version": log.model_version,
            "timestamp": log.timestamp.isoformat(),
        }
        for log in logs
    ]
