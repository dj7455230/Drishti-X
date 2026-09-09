"""
DRISHTI-X — User Model
Roles: HEALTH_WORKER | OPHTHALMOLOGIST | ADMIN
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.db.base import Base


class UserRole(str, enum.Enum):
    HEALTH_WORKER = "HEALTH_WORKER"
    OPHTHALMOLOGIST = "OPHTHALMOLOGIST"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.HEALTH_WORKER)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    facility_name = Column(String(255), nullable=True)
    facility_location = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    screenings = relationship("Screening", back_populates="created_by_user",
                               foreign_keys="Screening.created_by")
    reviews = relationship("DoctorReview", back_populates="reviewer")
    audit_logs = relationship("AuditLog", back_populates="user")

    def __repr__(self):
        return f"<User {self.email} [{self.role}]>"
