"""
Security utilities:
  - bcrypt password hashing via passlib
  - JWT creation / verification via python-jose
  - FastAPI dependencies: get_current_user, require_roles
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from functools import wraps
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.database import get_db, settings
from app.models.models import User

# ── Password hashing ───────────────────────────────────────────────────────────

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Return bcrypt hash of *plain* password."""
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches *hashed*."""
    return _pwd_context.verify(plain, hashed)


# ── JWT ────────────────────────────────────────────────────────────────────────

_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
_oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login", auto_error=False
)


def create_access_token(data: dict[str, Any]) -> str:
    """
    Create a signed JWT containing *data* plus an `exp` claim.
    Expiry is controlled by ACCESS_TOKEN_EXPIRE_MINUTES in settings.
    """
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload.update({"exp": expire})
    return jwt.encode(
        payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM
    )


def _decode_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT, raising 401 on any error."""
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exc
        return payload
    except JWTError:
        raise credentials_exc


# ── FastAPI dependencies ───────────────────────────────────────────────────────

def get_current_user(
    token: str = Depends(_oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency: resolve the Bearer JWT to a User ORM object.
    Raises 401 if the token is invalid or the user no longer exists / is inactive.
    """
    payload = _decode_token(token)
    user_id: str = payload["sub"]

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_optional_current_user(
    token: str | None = Depends(_oauth2_scheme_optional),
    db: Session = Depends(get_db),
) -> User | None:
    """
    Dependency: optionally resolve the Bearer JWT to a User ORM object.
    Returns None if no token is provided or if token is invalid/expired.
    Does not raise 401.
    """
    if not token:
        return None
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str | None = payload.get("sub")
        if not user_id:
            return None
        user = db.get(User, user_id)
        if user and user.is_active:
            return user
        return None
    except (JWTError, Exception):
        return None


def require_roles(*roles: str):
    """
    Dependency factory for role-based access control.

    Usage::

        @router.get("/admin-only")
        def admin_view(user: User = Depends(require_roles("admin"))):
            ...

        @router.get("/staff")
        def staff_view(user: User = Depends(require_roles("admin", "coordinator"))):
            ...
    """
    allowed = set(roles)

    def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(sorted(allowed))}",
            )
        return current_user

    return _check
