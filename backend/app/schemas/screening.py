from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
from app.models.screening import (
    ScreeningStatus, AssuranceDecision, ReferralPriority
)


class ScreeningCreate(BaseModel):
    patient_id: uuid.UUID
    eye_side: Optional[str] = None


class QualityResult(BaseModel):
    quality_score: float
    focus_score: float
    illumination_score: float
    fov_score: float
    is_gradable: bool
    feedback: str
    detail: Dict[str, Any] = {}


class LesionSummary(BaseModel):
    microaneurysm_count: int = 0
    microaneurysm_area: float = 0.0
    hemorrhage_count: int = 0
    hemorrhage_area: float = 0.0
    exudate_count: int = 0
    exudate_area: float = 0.0
    neovascularization_detected: bool = False
    lesion_evidence_score: float = 0.0
    provenance: str = "NOT_AVAILABLE"   # model name or algorithm


class PredictionOut(BaseModel):
    predicted_grade: int
    grade_label: str
    confidence: float
    probabilities: Dict[str, float]
    is_referable: bool
    model_name: str
    model_version: str
    model_status: str
    is_demo: bool
    gradcam_path: Optional[str] = None
    lesion_summary: Optional[LesionSummary] = None
    concordance_score: Optional[float] = None
    concordance_level: Optional[str] = None
    mismatch_detected: bool = False
    mismatch_details: Optional[List[str]] = None

    model_config = {"from_attributes": True}


class AssuranceResult(BaseModel):
    decision: AssuranceDecision
    reasons: List[str]
    referral_priority: ReferralPriority
    referral_score: float


class DoctorReviewCreate(BaseModel):
    doctor_grade: int
    doctor_notes: Optional[str] = None
    ai_grade_accepted: bool
    recapture_requested: bool = False
    recapture_reason: Optional[str] = None


class DoctorReviewOut(BaseModel):
    id: uuid.UUID
    doctor_grade: Optional[int]
    doctor_grade_label: Optional[str]
    doctor_notes: Optional[str]
    ai_grade_accepted: Optional[bool]
    ai_grade_modified: bool
    recapture_requested: bool
    reviewed_at: datetime

    model_config = {"from_attributes": True}


class ScreeningOut(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    status: ScreeningStatus
    eye_side: Optional[str]
    assurance_decision: Optional[AssuranceDecision]
    is_referable: Optional[bool]
    referral_priority: Optional[ReferralPriority]
    referral_score: Optional[float]
    is_synced: bool
    created_at: datetime
    analyzed_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ScreeningDetail(ScreeningOut):
    prediction: Optional[PredictionOut] = None
    doctor_review: Optional[DoctorReviewOut] = None
    quality: Optional[QualityResult] = None


class AnalysisResponse(BaseModel):
    screening_id: uuid.UUID
    prediction: PredictionOut
    quality: QualityResult
    assurance: AssuranceResult
    warnings: List[str] = []
