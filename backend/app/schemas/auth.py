"""
Pydantic schemas for authentication and user profile endpoints.

Note: EmailStr requires `pydantic[email]` (email-validator package).
      It is listed in requirements.txt. When running offline, email
      format is validated via a lightweight regex instead.
"""
from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

# ---------------------------------------------------------------------------
# Lightweight email type (no external dependency)
# Replace `_Email` with `EmailStr` from `pydantic` once email-validator
# is installed in your environment.
# ---------------------------------------------------------------------------
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _validate_email(v: str) -> str:
    if not _EMAIL_RE.match(v):
        raise ValueError("Invalid email address")
    return v.lower()


# ── Registration ───────────────────────────────────────────────────────────────

class UserRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, examples=["Alice Smith"])
    usn: str | None = Field(
        default=None,
        max_length=20,
        examples=["1MS21CS001"],
        description="University Seat Number (optional for non-students)",
    )
    email: str = Field(..., examples=["alice@example.com"])
    password: str = Field(..., min_length=8, max_length=128, examples=["s3cr3tP@ss"])
    target_group: int = Field(
        ...,
        ge=1,
        le=4,
        examples=[2],
        description="Group the student belongs to (1–4)",
    )

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _validate_email(v)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if v.isdigit() or v.isalpha():
            raise ValueError(
                "Password must contain both letters and numbers (or symbols)"
            )
        return v


# ── Login ──────────────────────────────────────────────────────────────────────

class UserLoginRequest(BaseModel):
    email: str = Field(..., examples=["alice@example.com"])
    password: str = Field(..., max_length=128, examples=["s3cr3tP@ss"])

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _validate_email(v)


# ── Token response ─────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str


# ── User profile ───────────────────────────────────────────────────────────────

class UserProfileResponse(BaseModel):
    id: str
    name: str
    usn: str | None
    email: str
    role: str
    target_group: int | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
