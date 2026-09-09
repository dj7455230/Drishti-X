from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
from app.models.patient import Gender


class PatientCreate(BaseModel):
    age: Optional[int] = None
    gender: Optional[Gender] = None
    diabetes_duration_years: Optional[int] = None
    facility_code: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    notes: Optional[str] = None


class PatientOut(BaseModel):
    id: uuid.UUID
    patient_code: str
    age: Optional[int]
    gender: Optional[Gender]
    diabetes_duration_years: Optional[int]
    facility_code: Optional[str]
    district: Optional[str]
    state: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class PatientWithHistory(PatientOut):
    screening_count: int = 0
    last_screening_date: Optional[datetime] = None
    latest_dr_grade: Optional[int] = None
