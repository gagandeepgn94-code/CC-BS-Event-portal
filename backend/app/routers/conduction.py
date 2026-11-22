"""
Conduction router – /api/v1/events/{event_id}/conduction

POST /attendance    Admin / Coordinator: mark attendance (single or bulk)
POST /judgement     Admin / Coordinator / Judge: submit score + rank
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.models import Attendance, Event, Judgement, Registration, User

router = APIRouter(
    prefix="/api/v1/events/{event_id}/conduction",
    tags=["Conduction"],
)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _require_live_event(event_id: str, db: Session) -> Event:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.status not in ("open", "live", "concluded"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot record attendance or scoring on an event in '{event.status}' state. "
                   "Event must be open, live, or concluded.",
        )
    return event


def _assert_can_manage_conduction(event: Event, user: User) -> None:
    if user.role == "admin":
        return
    if user.role == "coordinator" and event.coordinator_id == user.id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to manage attendance for this event.",
    )


def _get_registration(reg_id: str, event_id: str, db: Session) -> Registration:
    reg = db.execute(
        select(Registration).where(
            Registration.id == reg_id,
            Registration.event_id == event_id,
            Registration.status != "cancelled",
        )
    ).scalar_one_or_none()
    if reg is None:
        raise HTTPException(
            status_code=404,
            detail=f"Registration '{reg_id}' not found for this event.",
        )
    return reg


# ── POST /attendance ──────────────────────────────────────────────────────────

class AttendanceSingleRequest(BaseModel):
    registration_id: str
    is_present: bool = True


class AttendanceBulkRequest(BaseModel):
    registration_ids: list[str] = Field(..., min_length=1)
    is_present: bool = True


@router.post(
    "/attendance",
    summary="Mark attendance – single or bulk (Admin / Coordinator)",
)
def mark_attendance(
    event_id: str,
    payload: AttendanceBulkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
) -> dict:
    event = _require_live_event(event_id, db)
    _assert_can_manage_conduction(event, current_user)

    results: list[dict] = []
    check_in_time = datetime.now(timezone.utc)

    for reg_id in payload.registration_ids:
        try:
            reg = _get_registration(reg_id, event_id, db)
        except HTTPException as exc:
            results.append({"registration_id": reg_id, "status": "error", "detail": exc.detail})
            continue

        # Upsert attendance record
        att = db.execute(
            select(Attendance).where(Attendance.registration_id == reg_id)
        ).scalar_one_or_none()

        if att is None:
            att = Attendance(
                registration_id=reg_id,
                is_present=payload.is_present,
                marked_by=current_user.id,
                check_in_time=check_in_time if payload.is_present else None,
            )
            db.add(att)
        else:
            att.is_present = payload.is_present
            att.marked_by = current_user.id
            att.check_in_time = check_in_time if payload.is_present else att.check_in_time

        if payload.is_present and reg.status != "confirmed":
            reg.status = "confirmed"

        results.append({"registration_id": reg_id, "status": "ok", "is_present": payload.is_present})

    db.commit()

    errors = [r["detail"] for r in results if r.get("status") == "error"]
    if errors and len(errors) == len(payload.registration_ids):
        raise HTTPException(status_code=400, detail="; ".join(errors))

    return {"marked": len([r for r in results if r["status"] == "ok"]), "results": results}


# ── POST /judgement ───────────────────────────────────────────────────────────

class JudgementRequest(BaseModel):
    registration_id: str
    score: float = Field(..., ge=0, le=100, description="Numeric score (0–100, up to 2 decimal places)")
    remarks: Optional[str] = None
    rank: Optional[int] = Field(default=None, ge=1)
    prize_details: Optional[str] = None


@router.post(
    "/judgement",
    status_code=status.HTTP_201_CREATED,
    summary="Submit or update judgement for a registration (Admin / Coordinator / Judge)",
)
def submit_judgement(
    event_id: str,
    payload: JudgementRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator", "judge")),
) -> dict:
    event = _require_live_event(event_id, db)
    # Authorization: Admin, owning coordinator, or institution-level judge jury account
    # (Note: Event model has no assigned_judges mapping table; jury accounts have departmental evaluation access)
    if current_user.role == "coordinator" and event.coordinator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to evaluate or submit scores for this event.",
        )
    reg = _get_registration(payload.registration_id, event_id, db)

    # Upsert: one judgement record per (event, registration) pair
    existing = db.execute(
        select(Judgement).where(
            Judgement.event_id == event_id,
            Judgement.registration_id == payload.registration_id,
        )
    ).scalar_one_or_none()

    if existing:
        existing.judge_id = current_user.id
        existing.score = payload.score
        existing.remarks = payload.remarks
        existing.rank = payload.rank
        existing.prize_details = payload.prize_details
        j = existing
    else:
        j = Judgement(
            event_id=event_id,
            registration_id=payload.registration_id,
            judge_id=current_user.id,
            score=payload.score,
            remarks=payload.remarks,
            rank=payload.rank,
            prize_details=payload.prize_details,
        )
        db.add(j)

    db.commit()
    db.refresh(j)

    return {
        "judgement_id": j.id,
        "event_id": j.event_id,
        "registration_id": j.registration_id,
        "judge_id": j.judge_id,
        "score": float(j.score),
        "remarks": j.remarks,
        "rank": j.rank,
        "prize_details": j.prize_details,
    }
