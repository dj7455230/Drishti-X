"""
DRISHTI-X — Screening Routes
POST /api/screenings               — create screening
POST /api/screenings/{id}/image    — upload fundus image
POST /api/screenings/{id}/analyze  — run full AI pipeline
GET  /api/screenings/{id}          — get screening detail
GET  /api/screenings/{id}/evidence — get evidence summary
POST /api/screenings/{id}/doctor-review — submit doctor review
POST /api/screenings/{id}/recapture     — request recapture
GET  /api/screenings               — list screenings
"""
import uuid
import os
import shutil
import hashlib
from datetime import datetime, timezone
from typing import Annotated, List, Optional
from fastapi import (APIRouter, Depends, HTTPException, UploadFile, File,
                     BackgroundTasks, Query)
from sqlalchemy.orm import Session
from PIL import Image
import io

from app.db.base import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.screening import (
    Screening, FundusImage, Prediction, DoctorReview,
    ScreeningStatus, AssuranceDecision, ReferralPriority
)
from app.models.audit import AuditLog
from app.schemas.screening import (
    ScreeningCreate, ScreeningOut, ScreeningDetail,
    DoctorReviewCreate, DoctorReviewOut, AnalysisResponse,
    QualityResult, PredictionOut, AssuranceResult, LesionSummary
)
from app.api.deps import get_current_user, require_doctor
from app.core.config import settings

router = APIRouter(prefix="/api/screenings", tags=["Screenings"])

UPLOAD_DIR = settings.UPLOAD_DIR


def _get_screening_or_404(screening_id: uuid.UUID, db: Session) -> Screening:
    s = db.query(Screening).filter(Screening.id == screening_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Screening not found.")
    return s


def _audit(db: Session, user_id, screening_id, action: str,
           detail: str = None, old_val=None, new_val=None,
           model_version: str = None):
    db.add(AuditLog(
        user_id=user_id,
        screening_id=screening_id,
        action=action,
        resource_type="screening",
        resource_id=str(screening_id),
        detail=detail,
        old_value=old_val,
        new_value=new_val,
        model_version=model_version,
    ))


# ----------------------------------------------------------------
# CREATE SCREENING
# ----------------------------------------------------------------
@router.post("", response_model=ScreeningOut, status_code=201)
def create_screening(
    payload: ScreeningCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    screening = Screening(
        patient_id=payload.patient_id,
        created_by=current_user.id,
        eye_side=payload.eye_side,
        status=ScreeningStatus.PENDING,
    )
    db.add(screening)
    db.flush()
    _audit(db, current_user.id, screening.id, "SCREENING_CREATED",
           detail=f"Screening created for patient {patient.patient_code}")
    db.commit()
    db.refresh(screening)
    return screening


# ----------------------------------------------------------------
# UPLOAD IMAGE
# ----------------------------------------------------------------
@router.post("/{screening_id}/image", status_code=200)
async def upload_image(
    screening_id: uuid.UUID,
    file: Annotated[UploadFile, File(...)],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    screening = _get_screening_or_404(screening_id, db)

    # Read file bytes
    file_bytes = await file.read()

    # Validate
    from ai.quality.quality_engine import validate_image_file
    is_valid, err = validate_image_file(file_bytes, file.filename or "upload")
    if not is_valid:
        raise HTTPException(status_code=422, detail=f"Invalid image: {err}")

    # Save original
    save_dir = os.path.join(UPLOAD_DIR, str(screening_id))
    os.makedirs(save_dir, exist_ok=True)
    ext = os.path.splitext(file.filename or "upload.jpg")[1].lower() or ".jpg"
    original_path = os.path.join(save_dir, f"original{ext}")
    with open(original_path, "wb") as f:
        f.write(file_bytes)

    # Thumbnail
    thumb_path = os.path.join(save_dir, "thumbnail.jpg")
    try:
        img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        img.thumbnail((256, 256))
        img.save(thumb_path, "JPEG", quality=85)
    except Exception:
        thumb_path = None

    # File hash
    img_hash = hashlib.sha256(file_bytes).hexdigest()

    # Image dimensions
    try:
        img = Image.open(io.BytesIO(file_bytes))
        w, h = img.size
    except Exception:
        w, h = None, None

    # Upsert FundusImage record
    fundus = db.query(FundusImage).filter(
        FundusImage.screening_id == screening_id
    ).first()
    if fundus:
        fundus.original_path = original_path
        fundus.thumbnail_path = thumb_path
        fundus.original_filename = file.filename
        fundus.file_size_bytes = len(file_bytes)
        fundus.image_width = w
        fundus.image_height = h
        fundus.image_hash = img_hash
        fundus.image_format = ext.lstrip(".")
    else:
        fundus = FundusImage(
            screening_id=screening_id,
            original_path=original_path,
            thumbnail_path=thumb_path,
            original_filename=file.filename,
            file_size_bytes=len(file_bytes),
            image_width=w,
            image_height=h,
            image_hash=img_hash,
            image_format=ext.lstrip("."),
        )
        db.add(fundus)

    screening.status = ScreeningStatus.IMAGE_UPLOADED
    _audit(db, current_user.id, screening_id, "IMAGE_UPLOADED",
           detail=f"Image uploaded: {file.filename}, {len(file_bytes)} bytes")
    db.commit()

    return {
        "screening_id": str(screening_id),
        "status": "IMAGE_UPLOADED",
        "image_hash": img_hash,
        "dimensions": f"{w}x{h}" if w and h else "unknown",
        "message": "Image uploaded successfully. Call /analyze to run AI pipeline.",
    }


# ----------------------------------------------------------------
# RUN ANALYSIS
# ----------------------------------------------------------------
@router.post("/{screening_id}/analyze")
async def analyze_screening(
    screening_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    screening = _get_screening_or_404(screening_id, db)
    fundus = db.query(FundusImage).filter(
        FundusImage.screening_id == screening_id
    ).first()

    if not fundus or not fundus.original_path:
        raise HTTPException(
            status_code=422,
            detail="No image uploaded. Upload an image first via /image endpoint."
        )

    if not os.path.exists(fundus.original_path):
        raise HTTPException(
            status_code=422,
            detail="Image file not found on disk. Please re-upload."
        )

    # Run pipeline
    from ai.inference.inference_service import get_inference_service
    weights_path = os.path.join(settings.MODEL_DIR, "best_model.pth")
    service = get_inference_service(
        weights_path=weights_path if os.path.exists(weights_path) else None
    )

    save_dir = os.path.join(UPLOAD_DIR, str(screening_id))
    result = service.run_full_pipeline(
        image_path=fundus.original_path,
        screening_id=str(screening_id),
        save_dir=save_dir,
    )

    # Update FundusImage quality
    quality = result.get("quality", {})
    fundus.quality_score = quality.get("quality_score")
    fundus.focus_score = quality.get("focus_score")
    fundus.illumination_score = quality.get("illumination_score")
    fundus.fov_score = quality.get("fov_score")
    fundus.is_gradable = quality.get("is_gradable", False)
    fundus.quality_feedback = quality.get("feedback")
    fundus.quality_detail = quality.get("detail")

    if result.get("assurance_decision") == "RECAPTURE_REQUIRED":
        screening.status = ScreeningStatus.RECAPTURE_REQUIRED
        screening.assurance_decision = AssuranceDecision.RECAPTURE_REQUIRED
        screening.assurance_reasons = result.get("assurance_reasons", [])
        db.commit()
        return {
            "screening_id": str(screening_id),
            "status": "RECAPTURE_REQUIRED",
            "quality": quality,
            "assurance_decision": "RECAPTURE_REQUIRED",
            "reasons": result.get("assurance_reasons", []),
            "model_status": result.get("model_status"),
            "warnings": result.get("warnings", []),
        }

    # Upsert Prediction
    prediction = db.query(Prediction).filter(
        Prediction.screening_id == screening_id
    ).first()
    if not prediction:
        prediction = Prediction(screening_id=screening_id)
        db.add(prediction)

    prediction.predicted_grade = result.get("predicted_grade")
    prediction.grade_label = result.get("grade_label")
    prediction.confidence = result.get("confidence")
    prediction.probabilities = result.get("probabilities")
    prediction.is_referable = result.get("is_referable")
    prediction.model_name = result.get("model_name", "EfficientNet-B0")
    prediction.model_version = result.get("model_version", "0.0.0")
    prediction.model_status = result.get("model_status", "NOT_TRAINED")
    prediction.weights_hash = result.get("weights_hash")
    prediction.training_dataset = result.get("training_dataset")
    prediction.is_demo = result.get("is_demo", True)
    prediction.gradcam_path = result.get("gradcam_path")
    prediction.gradcam_target_layer = result.get("gradcam_target_layer")
    prediction.lesion_mask_path = result.get("lesion_mask_path")
    prediction.lesion_summary = result.get("lesion_summary")
    if result.get("lesion_summary"):
        prediction.lesion_evidence_score = result["lesion_summary"].get(
            "lesion_evidence_score"
        )
    prediction.concordance_score = result.get("concordance_score")
    prediction.concordance_level = result.get("concordance_level")
    prediction.mismatch_detected = result.get("mismatch_detected", False)
    prediction.mismatch_details = result.get("mismatch_details")

    # Update screening status
    assurance = result.get("assurance_decision", "HUMAN_REVIEW_REQUIRED")
    screening.assurance_decision = AssuranceDecision(assurance)
    screening.assurance_reasons = result.get("assurance_reasons", [])
    screening.is_referable = result.get("is_referable")
    screening.referral_score = result.get("referral_score")
    if result.get("referral_priority"):
        screening.referral_priority = ReferralPriority(result["referral_priority"])
    screening.analyzed_at = datetime.now(timezone.utc)

    if assurance == "HUMAN_REVIEW_REQUIRED":
        screening.status = ScreeningStatus.HUMAN_REVIEW_REQUIRED
    else:
        screening.status = ScreeningStatus.ANALYZED

    _audit(
        db, current_user.id, screening_id,
        "AI_PREDICTION",
        detail=f"Grade={result.get('predicted_grade')} "
               f"Confidence={result.get('confidence')} "
               f"ModelStatus={result.get('model_status')}",
        new_val={
            "predicted_grade": result.get("predicted_grade"),
            "confidence": result.get("confidence"),
            "model_status": result.get("model_status"),
            "is_demo": result.get("is_demo"),
        },
        model_version=result.get("model_version"),
    )
    db.commit()

    return {
        "screening_id": str(screening_id),
        "status": screening.status.value,
        "model_status": result.get("model_status"),
        "is_demo": result.get("is_demo"),
        "predicted_grade": result.get("predicted_grade"),
        "grade_label": result.get("grade_label"),
        "confidence": result.get("confidence"),
        "probabilities": result.get("probabilities"),
        "is_referable": result.get("is_referable"),
        "quality": quality,
        "lesion_summary": result.get("lesion_summary"),
        "gradcam_path": result.get("gradcam_path"),
        "assurance_decision": assurance,
        "assurance_reasons": result.get("assurance_reasons", []),
        "concordance_level": result.get("concordance_level"),
        "mismatch_detected": result.get("mismatch_detected", False),
        "referral_priority": result.get("referral_priority"),
        "referral_score": result.get("referral_score"),
        "warnings": result.get("warnings", []),
        "errors": result.get("errors", []),
    }


# ----------------------------------------------------------------
# GET SCREENING
# ----------------------------------------------------------------
@router.get("/{screening_id}", response_model=ScreeningOut)
def get_screening(
    screening_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return _get_screening_or_404(screening_id, db)


# ----------------------------------------------------------------
# LIST SCREENINGS
# ----------------------------------------------------------------
@router.get("", response_model=List[ScreeningOut])
def list_screenings(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    query = db.query(Screening)
    if status:
        query = query.filter(Screening.status == status)
    return query.order_by(Screening.created_at.desc()).offset(skip).limit(limit).all()


# ----------------------------------------------------------------
# DOCTOR REVIEW
# ----------------------------------------------------------------
@router.post("/{screening_id}/doctor-review", response_model=DoctorReviewOut)
def submit_doctor_review(
    screening_id: uuid.UUID,
    payload: DoctorReviewCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_doctor)],
):
    screening = _get_screening_or_404(screening_id, db)

    dr_labels = {
        0: "No DR", 1: "Mild NPDR", 2: "Moderate NPDR",
        3: "Severe NPDR", 4: "Proliferative DR"
    }

    review = db.query(DoctorReview).filter(
        DoctorReview.screening_id == screening_id
    ).first()
    if not review:
        review = DoctorReview(
            screening_id=screening_id,
            reviewer_id=current_user.id,
        )
        db.add(review)

    # Record doctor's INDEPENDENT assessment
    review.doctor_grade = payload.doctor_grade
    review.doctor_grade_label = dr_labels.get(payload.doctor_grade)
    review.doctor_is_referable = payload.doctor_grade >= 2
    review.doctor_notes = payload.doctor_notes
    review.ai_grade_accepted = payload.ai_grade_accepted
    review.recapture_requested = payload.recapture_requested
    review.recapture_reason = payload.recapture_reason

    # Check if doctor modified the AI grade
    prediction = db.query(Prediction).filter(
        Prediction.screening_id == screening_id
    ).first()
    if prediction and prediction.predicted_grade is not None:
        review.ai_grade_modified = (payload.doctor_grade != prediction.predicted_grade)

    screening.status = ScreeningStatus.REVIEWED
    if payload.recapture_requested:
        screening.status = ScreeningStatus.RECAPTURE_REQUIRED

    _audit(
        db, current_user.id, screening_id,
        "DOCTOR_REVIEW",
        detail=f"Doctor grade={payload.doctor_grade}, "
               f"AI accepted={payload.ai_grade_accepted}",
        old_val={"ai_grade": prediction.predicted_grade if prediction else None},
        new_val={"doctor_grade": payload.doctor_grade},
    )
    db.commit()
    db.refresh(review)
    return review


# ----------------------------------------------------------------
# REQUEST RECAPTURE
# ----------------------------------------------------------------
@router.post("/{screening_id}/recapture")
def request_recapture(
    screening_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    reason: str = "Recapture requested",
):
    screening = _get_screening_or_404(screening_id, db)
    screening.status = ScreeningStatus.RECAPTURE_REQUIRED
    _audit(db, current_user.id, screening_id, "RECAPTURE_REQUESTED",
           detail=reason)
    db.commit()
    return {"screening_id": str(screening_id), "status": "RECAPTURE_REQUIRED"}
