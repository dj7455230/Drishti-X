"""
DRISHTI-X — Auth Routes
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
"""
from datetime import datetime, timezone, timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import uuid

from app.db.base import get_db
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.schemas.user import UserCreate, UserOut, TokenResponse, LoginRequest
from app.core.security import hash_password, verify_password, create_access_token
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, db: Annotated[Session, Depends(get_db)]):
    """Register a new user."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        facility_name=payload.facility_name,
        facility_location=payload.facility_location,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Audit
    db.add(AuditLog(
        user_id=user.id,
        action="USER_REGISTERED",
        resource_type="user",
        resource_id=str(user.id),
        user_role=user.role.value,
        detail=f"User registered: {user.email}",
    ))
    db.commit()
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request,
          db: Annotated[Session, Depends(get_db)]):
    """Authenticate and return JWT access token."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled.")

    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})

    user.last_login = datetime.now(timezone.utc)
    db.commit()

    # Audit
    db.add(AuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        resource_type="user",
        resource_id=str(user.id),
        user_role=user.role.value,
        ip_address=request.client.host if request.client else None,
    ))
    db.commit()

    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: Annotated[User, Depends(get_current_user)]):
    """Return current authenticated user info."""
    return current_user
