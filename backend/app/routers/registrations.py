"""
Registrations router – /api/v1/events/{event_id}/registrations

POST   /          Student: register for an open event
GET    /          Admin / Coordinator / Judge: list participants
GET    /export    Admin / Coordinator: download participant list as .xlsx
"""
from __future__ import annotations

import io
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.models import Event, Registration, User

router = APIRouter(
    prefix="/api/v1/events/{event_id}/registrations",
    tags=["Registrations"],
)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_open_event(event_id: str, db: Session) -> Event:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


# ── POST / ────────────────────────────────────────────────────────────────────

from pydantic import BaseModel


class RegistrationRequest(BaseModel):
    team_name: Optional[str] = None
    team_members: Optional[dict] = None  # JSONB – free-form member data


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    summary="Register for an event (Student)",
)
def register_for_event(
    event_id: str,
    payload: RegistrationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("student")),
) -> dict:
    event = _get_open_event(event_id, db)

    # Event must be open
    if event.status != "open":
        raise HTTPException(
            status_code=400,
            detail=f"Registration is closed. Event status is '{event.status}'.",
        )

    # Student's target_group must be in event's target_groups
    allowed_groups = event.target_groups or []
    if current_user.target_group not in allowed_groups:
        raise HTTPException(
            status_code=403,
            detail="Your group is not eligible for this event.",
        )

    # Duplicate check
    existing = db.execute(
        select(Registration).where(
            Registration.event_id == event_id,
            Registration.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="You are already registered for this event.")

    # Max participants cap
    if event.max_participants is not None:
        count = db.execute(
            select(func.count()).where(Registration.event_id == event_id)
        ).scalar_one()
        if count >= event.max_participants:
            raise HTTPException(status_code=409, detail="Event has reached maximum participant capacity.")

    reg = Registration(
        event_id=event_id,
        user_id=current_user.id,
        team_name=payload.team_name,
        team_members=payload.team_members,
        status="confirmed",
    )
    db.add(reg)
    db.commit()
    db.refresh(reg)

    return {
        "id": reg.id,
        "event_id": reg.event_id,
        "user_id": reg.user_id,
        "team_name": reg.team_name,
        "team_members": reg.team_members,
        "status": reg.status,
        "registered_at": reg.registered_at,
    }


# ── GET / ─────────────────────────────────────────────────────────────────────

@router.get(
    "/",
    summary="List event participants (Admin / Coordinator / Judge)",
)
def list_registrations(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator", "judge")),
) -> list[dict]:
    event = _get_open_event(event_id, db)
    if current_user.role == "coordinator" and event.coordinator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view registrations for this event.",
        )

    rows = db.execute(
        select(Registration)
        .where(Registration.event_id == event_id)
        .options(
            selectinload(Registration.user),
            selectinload(Registration.attendance),
        )
        .order_by(Registration.registered_at)
    ).scalars().all()

    return [
        {
            "id": r.id,
            "registration_id": r.id,
            "user_id": r.user_id,
            "student_id": r.user_id,
            "name": r.user.name,
            "student_name": r.user.name,
            "usn": r.user.usn,
            "email": r.user.email,
            "target_group": r.user.target_group,
            "team_name": r.team_name,
            "team_members": r.team_members,
            "status": r.status,
            "registered_at": r.registered_at,
            "attended": r.attendance.is_present if r.attendance else None,
        }
        for r in rows
    ]


# ── GET /export ───────────────────────────────────────────────────────────────

@router.get(
    "/export",
    summary="Export participant list as .xlsx (Admin / Coordinator)",
)
def export_registrations(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
) -> StreamingResponse:
    event = _get_open_event(event_id, db)
    if current_user.role == "coordinator" and event.coordinator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to export registrations for this event.",
        )
    rows = db.execute(
        select(Registration)
        .where(Registration.event_id == event_id)
        .options(selectinload(Registration.user))
        .order_by(Registration.registered_at)
    ).scalars().all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Participants"

    # Header
    headers = [
        "No.", "Name", "USN", "Email", "Target Group",
        "Team Name", "Team Members", "Status", "Registered At",
    ]
    ws.append(headers)

    # Style header row bold
    from openpyxl.styles import Font
    for cell in ws[1]:
        cell.font = Font(bold=True)

    # Data rows
    for idx, r in enumerate(rows, start=1):
        members_str = str(r.team_members) if r.team_members else ""
        ws.append([
            idx,
            r.user.name,
            r.user.usn or "",
            r.user.email,
            r.user.target_group,
            r.team_name or "",
            members_str,
            r.status,
            r.registered_at.strftime("%Y-%m-%d %H:%M") if r.registered_at else "",
        ])

    # Auto-width columns
    for col in ws.columns:
        max_len = max((len(str(cell.value or "")) for cell in col), default=10)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 50)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    safe_title = "".join(c if c.isalnum() else "_" for c in event.title)
    filename = f"participants_{safe_title}.xlsx"

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Student Personal Registrations Router ───────────────────────────────────────

student_registrations_router = APIRouter(
    prefix="/api/v1/registrations",
    tags=["Registrations"],
)


@student_registrations_router.get(
    "/my",
    summary="Get current student's registrations with attendance and certificate status",
)
def get_my_registrations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("student")),
) -> list[dict]:
    regs = db.execute(
        select(Registration)
        .where(Registration.user_id == current_user.id)
        .options(
            selectinload(Registration.event),
            selectinload(Registration.attendance),
            selectinload(Registration.certificate),
        )
        .order_by(Registration.registered_at.desc())
    ).scalars().all()

    from app.core.s3 import get_presigned_url

    results = []
    for r in regs:
        cert_data = None
        if r.certificate:
            cert_data = {
                "id": r.certificate.id,
                "cert_type": r.certificate.cert_type,
                "verification_code": r.certificate.verification_code,
                "issued_at": r.certificate.issued_at,
                "download_url": get_presigned_url(r.certificate.s3_key),
            }

        att_data = None
        if r.attendance:
            att_data = {
                "is_present": r.attendance.is_present,
                "check_in_time": r.attendance.check_in_time,
            }

        results.append({
            "id": r.id,
            "registration_id": r.id,
            "event_id": r.event_id,
            "event_title": r.event.title,
            "event_status": r.event.status,
            "event_date": r.event.event_date,
            "event_location": r.event.location,
            "team_name": r.team_name,
            "status": r.status,
            "registered_at": r.registered_at,
            "attended": r.attendance.is_present if r.attendance else None,
            "certificate_url": cert_data["download_url"] if cert_data else None,
            "attendance": att_data,
            "certificate": cert_data,
        })

    return results

