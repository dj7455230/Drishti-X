"""
DRISHTI-X — Patient Model
Uses de-identified / synthetic patient data for the prototype.
"""
import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Date, DateTime, Text, Integer, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.db.base import Base


class Gender(str, enum.Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"
    PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY"


class Patient(Base):
    __tablename__ = "patients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Using a generated patient_code — no real PII stored
    patient_code = Column(String(50), unique=True, nullable=False, index=True)
    age = Column(Integer, nullable=True)
    gender = Column(SAEnum(Gender), nullable=True)
    diabetes_duration_years = Column(Integer, nullable=True)
    facility_code = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    screenings = relationship("Screening", back_populates="patient",
                               order_by="Screening.created_at")

    def __repr__(self):
        return f"<Patient {self.patient_code}>"
