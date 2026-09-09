"""
DRISHTI-X — Patient Routes
POST /api/patients
GET  /api/patients
GET  /api/patients/{id}
"""
import uuid
import random
import string
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.models.patient import Patient
from app.models.screening import Screening
from app.schemas.patient import PatientCreate, PatientOut, PatientWithHistory
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/patients", tags=["Patients"])


def generate_patient_code() -> str:
    """Generate a de-identified patient code: DX-YYYYMM-XXXXXX"""
    from datetime import datetime
    prefix = datetime.now().strftime("DX-%Y%m-")
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return prefix + suffix


@router.post("", response_model=PatientOut, status_code=201)
def create_patient(
    payload: PatientCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Register a new patient. Uses de-identified patient code."""
    code = generate_patient_code()
    # Ensure uniqueness
    while db.query(Patient).filter(Patient.patient_code == code).first():
        code = generate_patient_code()

    patient = Patient(
        patient_code=code,
        age=payload.age,
        gender=payload.gender,
        diabetes_duration_years=payload.diabetes_duration_years,
        facility_code=payload.facility_code,
        district=payload.district,
        state=payload.state,
        notes=payload.notes,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("", response_model=List[PatientWithHistory])
def list_patients(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    district: str = Query(None),
):
    """List patients with summary info."""
    query = db.query(Patient)
    if district:
        query = query.filter(Patient.district == district)
    patients = query.offset(skip).limit(limit).all()

    results = []
    for p in patients:
        screenings = db.query(Screening).filter(Screening.patient_id == p.id).all()
        latest_grade = None
        last_date = None
        if screenings:
            latest = max(screenings, key=lambda s: s.created_at)
            last_date = latest.created_at
            if latest.prediction:
                latest_grade = latest.prediction.predicted_grade

        results.append(PatientWithHistory(
            **PatientOut.model_validate(p).model_dump(),
            screening_count=len(screenings),
            last_screening_date=last_date,
            latest_dr_grade=latest_grade,
        ))
    return results


@router.get("/{patient_id}", response_model=PatientWithHistory)
def get_patient(
    patient_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get a patient with their screening history."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    screenings = db.query(Screening).filter(Screening.patient_id == patient.id).all()
    latest_grade = None
    last_date = None
    if screenings:
        latest = max(screenings, key=lambda s: s.created_at)
        last_date = latest.created_at
        if latest.prediction:
            latest_grade = latest.prediction.predicted_grade

    return PatientWithHistory(
        **PatientOut.model_validate(patient).model_dump(),
        screening_count=len(screenings),
        last_screening_date=last_date,
        latest_dr_grade=latest_grade,
    )
