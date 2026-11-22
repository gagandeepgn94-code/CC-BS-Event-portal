"""
Conclude router – /api/v1/events/{event_id}/conclude

POST /certificates/generate    Admin / Coordinator: generate PDF certs for all verified attendees
GET  /verify/{verification_code}    Public: verify a certificate
GET  /report                   Admin / Coordinator: download event dossier PDF
"""
from __future__ import annotations

import io
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db, settings
from app.core.s3 import build_key, upload_file
from app.core.security import get_current_user, require_roles
from app.models.models import (
    Attendance,
    Certificate,
    Event,
    Judgement,
    Registration,
    User,
)
from app.services.pdf_service import generate_certificate_pdf, generate_dossier_pdf

router = APIRouter(
    prefix="/api/v1/events/{event_id}/conclude",
    tags=["Conclude"],
)

# Base URL used in QR codes – override via env if needed
_VERIFY_BASE = "http://localhost:8000/api/v1/events"


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_concluded_or_live_event(event_id: str, db: Session) -> Event:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.status not in ("live", "concluded"):
        raise HTTPException(
            status_code=400,
            detail=f"Certificate generation requires event status 'live' or 'concluded' (current: '{event.status}').",
        )
    return event


def _assert_admin_or_assigned_coordinator(event: Event, user: User) -> None:
    if user.role == "admin":
        return
    if user.role == "coordinator" and event.coordinator_id == user.id:
        return
    raise HTTPException(status_code=403, detail="Permission denied for this event.")


# ── POST /certificates/generate ───────────────────────────────────────────────

class CertGenerateRequest(BaseModel):
    verification_base_url: Optional[str] = None  # defaults to _VERIFY_BASE/verify


@router.post(
    "/certificates/generate",
    summary="Generate PDF certificates for all verified attendees (Admin / Coordinator)",
)
def generate_certificates(
    event_id: str,
    payload: CertGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
) -> dict:
    event = _get_concluded_or_live_event(event_id, db)
    _assert_admin_or_assigned_coordinator(event, current_user)

    base_url = (payload.verification_base_url or _VERIFY_BASE) + f"/{event_id}/conclude/verify"

    # Fetch all present attendees with their registrations + users
    rows = db.execute(
        select(Attendance)
        .join(Registration, Attendance.registration_id == Registration.id)
        .where(
            Registration.event_id == event_id,
            Attendance.is_present.is_(True),
        )
        .options(
            selectinload(Attendance.registration).selectinload(Registration.user),
            selectinload(Attendance.registration).selectinload(Registration.judgement),
        )
    ).scalars().all()

    if not rows:
        raise HTTPException(
            status_code=400,
            detail="No verified attendees found. Mark attendance before generating certificates.",
        )

    created, skipped = 0, 0

    for att in rows:
        reg = att.registration
        user = reg.user
        judgement = reg.judgement

        # Determine cert type
        cert_type = "winner" if (judgement and judgement.rank is not None) else "participation"

        # Skip if certificate already exists
        existing = db.execute(
            select(Certificate).where(Certificate.registration_id == reg.id)
        ).scalar_one_or_none()
        if existing:
            skipped += 1
            continue

        # Generate verification code
        verification_code = uuid.uuid4().hex

        # Build PDF bytes
        pdf_bytes = generate_certificate_pdf(
            student_name=user.name,
            usn=user.usn,
            event_title=event.title,
            event_date=event.event_date,
            cert_type=cert_type,
            rank=judgement.rank if judgement else None,
            prize_details=judgement.prize_details if judgement else None,
            verification_code=verification_code,
            verification_base_url=base_url,
        )

        # Upload PDF
        s3_key = build_key("certificates", f"{verification_code}.pdf")
        upload_file(io.BytesIO(pdf_bytes), s3_key, "application/pdf")

        # Persist certificate record
        cert = Certificate(
            registration_id=reg.id,
            cert_type=cert_type,
            verification_code=verification_code,
            s3_key=s3_key,
        )
        db.add(cert)
        created += 1

    db.commit()

    return {
        "event_id": event_id,
        "certificates_created": created,
        "skipped_already_issued": skipped,
        "total_attendees": len(rows),
    }


# ── GET /verify/{verification_code} ───────────────────────────────────────────

@router.get(
    "/verify/{verification_code}",
    summary="Verify a certificate (Public)",
)
def verify_certificate(
    event_id: str,
    verification_code: str,
    db: Session = Depends(get_db),
) -> dict:
    cert = db.execute(
        select(Certificate)
        .where(Certificate.verification_code == verification_code)
        .options(
            selectinload(Certificate.registration).selectinload(Registration.user),
            selectinload(Certificate.registration).selectinload(Registration.event),
        )
    ).scalar_one_or_none()

    if cert is None:
        raise HTTPException(status_code=404, detail="Certificate not found or verification code is invalid.")

    reg = cert.registration
    # Also verify the event_id matches (prevents cross-event spoofing)
    if reg.event_id != event_id:
        raise HTTPException(status_code=404, detail="Certificate not found for this event.")

    return {
        "valid": True,
        "verification_code": verification_code,
        "cert_type": cert.cert_type,
        "student_name": reg.user.name,
        "usn": reg.user.usn,
        "event_title": reg.event.title,
        "event_date": reg.event.event_date,
        "issued_at": cert.issued_at,
    }


# ── Global Public Verification Router ──────────────────────────────────────────

public_verify_router = APIRouter(
    prefix="/api/v1/verify",
    tags=["Verification"],
)


@public_verify_router.get(
    "/{verification_code}",
    summary="Verify a certificate globally by code (Public)",
)
def public_verify_certificate(
    verification_code: str,
    db: Session = Depends(get_db),
) -> dict:
    from app.core.s3 import get_presigned_url

    cert = db.execute(
        select(Certificate)
        .where(Certificate.verification_code == verification_code)
        .options(
            selectinload(Certificate.registration).selectinload(Registration.user),
            selectinload(Certificate.registration).selectinload(Registration.event),
        )
    ).scalar_one_or_none()

    if cert is None:
        raise HTTPException(
            status_code=404,
            detail="Certificate not found or verification code is invalid.",
        )

    reg = cert.registration
    return {
        "valid": True,
        "verification_code": verification_code,
        "cert_type": cert.cert_type,
        "student_name": reg.user.name,
        "usn": reg.user.usn,
        "event_title": reg.event.title,
        "event_date": reg.event.event_date,
        "issued_at": cert.issued_at,
        "download_url": get_presigned_url(cert.s3_key),
    }



# ── GET /report ───────────────────────────────────────────────────────────────

@router.get(
    "/report",
    summary="Download event dossier PDF (Admin / Coordinator)",
)
def download_report(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
) -> StreamingResponse:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    _assert_admin_or_assigned_coordinator(event, current_user)

    # Aggregate statistics
    total_regs = db.execute(
        select(func.count()).where(Registration.event_id == event_id)
    ).scalar_one()

    attendance_count = db.execute(
        select(func.count())
        .select_from(Attendance)
        .join(Registration, Attendance.registration_id == Registration.id)
        .where(
            Registration.event_id == event_id,
            Attendance.is_present.is_(True),
        )
    ).scalar_one()

    # Winners = registrations with a rank in judgements
    winner_rows = db.execute(
        select(Judgement, User, Registration)
        .join(Registration, Judgement.registration_id == Registration.id)
        .join(User, Registration.user_id == User.id)
        .where(
            Judgement.event_id == event_id,
            Judgement.rank.isnot(None),
        )
        .order_by(Judgement.rank)
    ).all()

    winners = [
        {
            "name": u.name,
            "usn": u.usn,
            "rank": j.rank,
            "score": j.score,
            "prize_details": j.prize_details,
        }
        for j, u, r in winner_rows
    ]

    pdf_bytes = generate_dossier_pdf(
        event_title=event.title,
        event_date=event.event_date,
        location=event.location,
        total_registrations=total_regs,
        attendance_count=attendance_count,
        winners=winners,
    )

    safe_title = "".join(c if c.isalnum() else "_" for c in event.title)
    filename = f"dossier_{safe_title}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
