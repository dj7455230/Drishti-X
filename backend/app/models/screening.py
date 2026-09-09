"""
DRISHTI-X — Screening, FundusImage, Prediction, DoctorReview, Report Models
Central clinical workflow tables.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, Text,
    ForeignKey, JSON, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.db.base import Base


class ScreeningStatus(str, enum.Enum):
    PENDING = "PENDING"
    IMAGE_UPLOADED = "IMAGE_UPLOADED"
    QUALITY_ASSESSED = "QUALITY_ASSESSED"
    RECAPTURE_REQUIRED = "RECAPTURE_REQUIRED"
    ANALYZED = "ANALYZED"
    HUMAN_REVIEW_REQUIRED = "HUMAN_REVIEW_REQUIRED"
    VALIDATED = "VALIDATED"
    REVIEWED = "REVIEWED"
    COMPLETED = "COMPLETED"


class AssuranceDecision(str, enum.Enum):
    VALIDATED = "VALIDATED"
    HUMAN_REVIEW_REQUIRED = "HUMAN_REVIEW_REQUIRED"
    RECAPTURE_REQUIRED = "RECAPTURE_REQUIRED"


class ReferralPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class DRGrade(int, enum.Enum):
    NO_DR = 0
    MILD_NPDR = 1
    MODERATE_NPDR = 2
    SEVERE_NPDR = 3
    PROLIFERATIVE_DR = 4


class Screening(Base):
    __tablename__ = "screenings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(SAEnum(ScreeningStatus), default=ScreeningStatus.PENDING, nullable=False)
    eye_side = Column(String(10), nullable=True)   # LEFT | RIGHT | BOTH

    # Final assurance decision
    assurance_decision = Column(SAEnum(AssuranceDecision), nullable=True)
    assurance_reasons = Column(JSON, nullable=True)        # list of reason strings

    # Referral
    is_referable = Column(Boolean, nullable=True)
    referral_priority = Column(SAEnum(ReferralPriority), nullable=True)
    referral_score = Column(Float, nullable=True)          # 0–100

    # Offline / sync
    is_synced = Column(Boolean, default=True)
    sync_pending = Column(Boolean, default=False)
    offline_captured = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))
    analyzed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    patient = relationship("Patient", back_populates="screenings")
    created_by_user = relationship("User", back_populates="screenings", foreign_keys=[created_by])
    fundus_image = relationship("FundusImage", back_populates="screening", uselist=False)
    prediction = relationship("Prediction", back_populates="screening", uselist=False)
    doctor_review = relationship("DoctorReview", back_populates="screening", uselist=False)
    report = relationship("Report", back_populates="screening", uselist=False)
    audit_logs = relationship("AuditLog", back_populates="screening")

    def __repr__(self):
        return f"<Screening {self.id} [{self.status}]>"


class FundusImage(Base):
    __tablename__ = "fundus_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    screening_id = Column(UUID(as_uuid=True), ForeignKey("screenings.id"), nullable=False, unique=True)

    # File paths (relative to UPLOAD_DIR)
    original_path = Column(String(500), nullable=True)
    enhanced_path = Column(String(500), nullable=True)
    thumbnail_path = Column(String(500), nullable=True)

    # Image metadata
    original_filename = Column(String(255), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    image_width = Column(Integer, nullable=True)
    image_height = Column(Integer, nullable=True)
    image_hash = Column(String(64), nullable=True)        # SHA-256 for dedup/audit
    image_format = Column(String(20), nullable=True)

    # Quality assessment
    quality_score = Column(Float, nullable=True)           # 0–100
    focus_score = Column(Float, nullable=True)
    illumination_score = Column(Float, nullable=True)
    fov_score = Column(Float, nullable=True)
    is_gradable = Column(Boolean, nullable=True)
    quality_feedback = Column(Text, nullable=True)
    quality_detail = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    screening = relationship("Screening", back_populates="fundus_image")

    def __repr__(self):
        return f"<FundusImage {self.id} quality={self.quality_score}>"


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    screening_id = Column(UUID(as_uuid=True), ForeignKey("screenings.id"), nullable=False, unique=True)

    # DR Classification
    predicted_grade = Column(Integer, nullable=True)       # 0–4
    grade_label = Column(String(50), nullable=True)
    confidence = Column(Float, nullable=True)              # top class probability
    probabilities = Column(JSON, nullable=True)            # {0: p0, 1: p1, ..., 4: p4}
    is_referable = Column(Boolean, nullable=True)

    # Model provenance — every prediction records its source
    model_name = Column(String(100), nullable=True)
    model_version = Column(String(50), nullable=True)
    model_status = Column(String(50), nullable=True)       # NOT_TRAINED | TRAINED | DEMO
    weights_hash = Column(String(64), nullable=True)
    training_dataset = Column(String(100), nullable=True)
    is_demo = Column(Boolean, default=True)                # True until real model trained

    # Grad-CAM
    gradcam_path = Column(String(500), nullable=True)
    gradcam_target_layer = Column(String(100), nullable=True)

    # Lesion evidence (from U-Net / CV pipeline)
    lesion_mask_path = Column(String(500), nullable=True)
    lesion_summary = Column(JSON, nullable=True)           # counts, areas, types
    lesion_evidence_score = Column(Float, nullable=True)   # 0–1

    # Evidence concordance
    concordance_score = Column(Float, nullable=True)       # 0–1
    concordance_level = Column(String(20), nullable=True)  # HIGH | MODERATE | LOW
    mismatch_detected = Column(Boolean, default=False)
    mismatch_details = Column(JSON, nullable=True)

    # Retinal structures
    optic_disc_centroid = Column(JSON, nullable=True)      # {x, y}
    fovea_center = Column(JSON, nullable=True)             # {x, y}
    vessel_density = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    screening = relationship("Screening", back_populates="prediction")

    def __repr__(self):
        return f"<Prediction grade={self.predicted_grade} conf={self.confidence} demo={self.is_demo}>"


class DoctorReview(Base):
    __tablename__ = "doctor_reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    screening_id = Column(UUID(as_uuid=True), ForeignKey("screenings.id"), nullable=False, unique=True)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Doctor's independent assessment — stored SEPARATE from AI prediction
    doctor_grade = Column(Integer, nullable=True)          # 0–4
    doctor_grade_label = Column(String(50), nullable=True)
    doctor_is_referable = Column(Boolean, nullable=True)
    doctor_notes = Column(Text, nullable=True)
    doctor_priority_override = Column(SAEnum(ReferralPriority), nullable=True)

    # Did doctor agree with AI?
    ai_grade_accepted = Column(Boolean, nullable=True)
    ai_grade_modified = Column(Boolean, default=False)
    recapture_requested = Column(Boolean, default=False)
    recapture_reason = Column(Text, nullable=True)

    reviewed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    screening = relationship("Screening", back_populates="doctor_review")
    reviewer = relationship("User", back_populates="reviews")

    def __repr__(self):
        return f"<DoctorReview screening={self.screening_id} grade={self.doctor_grade}>"


class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    screening_id = Column(UUID(as_uuid=True), ForeignKey("screenings.id"), nullable=False, unique=True)

    report_path = Column(String(500), nullable=True)
    report_format = Column(String(20), default="PDF")
    summary = Column(JSON, nullable=True)
    generated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    generated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Clearly labeled
    disclaimer = Column(Text, default=(
        "AI-ASSISTED SCREENING — NOT A FINAL MEDICAL DIAGNOSIS. "
        "This report is generated by an AI screening prototype and requires "
        "ophthalmologist review before any clinical decision."
    ))

    # Relationships
    screening = relationship("Screening", back_populates="report")

    def __repr__(self):
        return f"<Report screening={self.screening_id}>"
