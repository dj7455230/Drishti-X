"""
DRISHTI-X — Audit Log Model
Every important action is recorded for traceability and clinical accountability.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    screening_id = Column(UUID(as_uuid=True), ForeignKey("screenings.id"), nullable=True, index=True)

    # Action metadata
    action = Column(String(100), nullable=False)           # e.g. "AI_PREDICTION", "DOCTOR_REVIEW"
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(100), nullable=True)
    user_role = Column(String(50), nullable=True)

    # Change tracking
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    detail = Column(Text, nullable=True)

    # Request metadata
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)

    # Model version at time of action
    model_version = Column(String(50), nullable=True)

    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    user = relationship("User", back_populates="audit_logs")
    screening = relationship("Screening", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog {self.action} at {self.timestamp}>"


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    architecture = Column(String(100), nullable=True)
    weights_hash = Column(String(64), nullable=True)
    training_dataset = Column(String(200), nullable=True)
    training_config = Column(JSON, nullable=True)
    status = Column(String(50), default="NOT_TRAINED")     # NOT_TRAINED | TRAINED | VALIDATED | DEMO
    is_active = Column(Boolean, default=False)

    # Metrics (None until evaluated on real held-out test set)
    accuracy = Column(Float, nullable=True)
    sensitivity = Column(Float, nullable=True)
    specificity = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    roc_auc = Column(Float, nullable=True)
    metrics_note = Column(Text, default="Not yet validated")

    trained_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<ModelVersion {self.model_name} v{self.version} [{self.status}]>"
