"""
DRISHTI-X — FastAPI Dependencies
Shared dependencies: DB session, current user, role guards.
"""
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Return the authenticated user from JWT token."""
    payload = decode_access_token(token)
    user_id: str = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


def require_doctor(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """Allow OPHTHALMOLOGIST and ADMIN roles only."""
    if current_user.role not in (UserRole.OPHTHALMOLOGIST, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Required role: OPHTHALMOLOGIST or ADMIN",
        )
    return current_user


def require_admin(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """Allow ADMIN role only."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Required role: ADMIN",
        )
    return current_user
