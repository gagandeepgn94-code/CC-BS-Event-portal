"""
Authentication router – /api/v1/auth
  POST /register  → create a student account
  POST /login     → return JWT access token + role
  GET  /me        → return the logged-in user's profile
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models.models import User
from app.schemas.auth import (
    TokenResponse,
    UserLoginRequest,
    UserProfileResponse,
    UserRegisterRequest,
)

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


# ── POST /register ─────────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=UserProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new student account",
)
@limiter.limit("10/minute")
def register(request: Request, payload: UserRegisterRequest, db: Session = Depends(get_db)) -> User:
    # Check for duplicate email / USN before attempting insert
    existing = db.execute(
        select(User).where(User.email == payload.email)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    if payload.usn:
        dup_usn = db.execute(
            select(User).where(User.usn == payload.usn)
        ).scalar_one_or_none()
        if dup_usn:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this USN already exists",
            )

    user = User(
        name=payload.name,
        usn=payload.usn,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="student",
        target_group=payload.target_group,
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration failed due to a conflict. Please check email or USN.",
        )

    return user


# ── POST /login ────────────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Obtain a JWT access token",
)
@limiter.limit("10/minute")
def login(request: Request, payload: UserLoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.execute(
        select(User).where(User.email == payload.email)
    ).scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact the administrator.",
        )

    token = create_access_token({"sub": user.id, "role": user.role})

    return TokenResponse(
        access_token=token,
        role=user.role,
        user_id=user.id,
    )


# ── GET /me ────────────────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="Get the currently authenticated user's profile",
)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
