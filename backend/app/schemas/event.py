"""
Pydantic schemas for the Events module.
"""
from __future__ import annotations

from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


# ── Shared / base ──────────────────────────────────────────────────────────────

class EventBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255, examples=["Hackathon 2026"])
    description: str | None = Field(default=None, examples=["Annual coding hackathon"])
    target_groups: List[int] = Field(
        ...,
        min_length=1,
        examples=[[1, 2]],
        description="List of target group numbers (1–4) this event is open to",
    )
    rules: str | None = Field(default=None, examples=["No plagiarism allowed"])
    location: str | None = Field(default=None, max_length=255, examples=["Seminar Hall A"])
    event_date: datetime | None = Field(default=None, examples=["2026-12-01T09:00:00Z"])
    max_participants: int | None = Field(default=None, ge=1, examples=[100])


# ── Create (form fields; files come as UploadFile in the router) ───────────────

class EventCreateRequest(EventBase):
    pass


# ── Guidelines patch ───────────────────────────────────────────────────────────

class EventGuidelinesUpdate(BaseModel):
    rules: str | None = None
    location: str | None = Field(default=None, max_length=255)
    max_participants: int | None = Field(default=None, ge=1)
    event_type: str | None = None
    budget: str | None = None
    venue_permission_status: str | None = None
    judgment_criteria: str | None = None
    prizes: str | None = None
    concluding_remarks: str | None = None


# ── Status patch ───────────────────────────────────────────────────────────────

_VALID_TRANSITIONS: dict[str, list[str]] = {
    "draft": ["open"],
    "open":  ["live", "draft"],
    "live":  ["concluded"],
    "concluded": [],
}

VALID_STATUSES = ["draft", "open", "live", "concluded"]


class EventStatusUpdate(BaseModel):
    status: str = Field(..., examples=["open"])

    @classmethod
    def validate_transition(cls, current: str, new: str) -> None:
        """Raise ValueError if the transition current → new is not allowed."""
        allowed = _VALID_TRANSITIONS.get(current, [])
        if new not in allowed:
            raise ValueError(
                f"Cannot transition from '{current}' to '{new}'. "
                f"Allowed next states: {allowed or ['none']}"
            )


# ── Responses ──────────────────────────────────────────────────────────────────

class CoordinatorBrief(BaseModel):
    id: str
    name: str
    email: str

    model_config = {"from_attributes": True}


class EventResponse(BaseModel):
    id: str
    title: str
    description: str | None
    target_groups: list[int] | None
    target_branches: list[str] | None = None
    event_type: str | None = None
    budget: str | None = None
    venue_permission_status: str | None = None
    judgment_criteria: str | None = None
    prizes: str | None = None
    concluding_remarks: str | None = None
    event_photos: list[str] | None = None
    rules: str | None
    location: str | None
    event_date: datetime | None
    max_participants: int | None
    status: str
    coordinator_id: str | None
    coordinator: CoordinatorBrief | None
    created_at: datetime
    # Presigned / local URLs injected by the router
    circular_url: str | None = None
    poster_url: str | None = None

    model_config = {"from_attributes": True}


class EventListResponse(BaseModel):
    id: str
    title: str
    description: str | None
    target_groups: list[int] | None
    target_branches: list[str] | None = None
    event_type: str | None = None
    location: str | None
    event_date: datetime | None
    status: str
    coordinator_id: str | None
    poster_url: str | None = None

    model_config = {"from_attributes": True}


# ── Feedback schemas ──────────────────────────────────────────────────────────

class FeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = None


class FeedbackResponse(BaseModel):
    id: str
    event_id: str
    user_id: str
    user_name: str | None = None
    rating: int
    comment: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
