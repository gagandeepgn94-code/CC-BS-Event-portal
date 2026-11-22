"""
Events router – /api/v1/events

POST   /                           Create event (Admin / Coordinator)
GET    /                           List events (public; students filtered by target_group)
GET    /{event_id}                 Get full event detail with presigned URLs
PATCH  /{event_id}/guidelines      Update rules / location / max_participants / planning info
PATCH  /{event_id}/status          Advance event status along the allowed state machine
POST   /{event_id}/photos          Upload event conduction photos
POST   /{event_id}/feedback        Submit student feedback for an event
GET    /{event_id}/feedback        List all feedback for an event
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.s3 import build_key, delete_file, get_presigned_url, upload_file
from app.core.security import get_current_user, get_optional_current_user, require_roles
from app.models.models import Event, Feedback, Registration, User
from app.schemas.event import (
    EventGuidelinesUpdate,
    EventListResponse,
    EventResponse,
    EventStatusUpdate,
    FeedbackCreate,
    FeedbackResponse,
)

router = APIRouter(prefix="/api/v1/events", tags=["Events"])

# ── Upload Constants & Helper ──────────────────────────────────────────────────
ALLOWED_CIRCULAR_EXTS = {".pdf"}
ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_CIRCULAR_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_IMAGE_BYTES = 5 * 1024 * 1024       # 5 MB


def _validate_uploaded_file(
    file: UploadFile,
    allowed_exts: set[str],
    max_bytes: int,
    file_kind: str = "file",
) -> None:
    filename = file.filename or ""
    ext = Path(filename).suffix.lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"{file_kind.capitalize()} extension '{ext}' is not permitted. Allowed: {', '.join(sorted(allowed_exts))}",
        )

    header = file.file.read(16)
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > max_bytes:
        max_mb = max_bytes // (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"{file_kind.capitalize()} size ({file_size / (1024*1024):.1f} MB) exceeds maximum allowed limit of {max_mb} MB.",
        )

    if ".pdf" in allowed_exts and ext == ".pdf":
        if not header.startswith(b"%PDF"):
            raise HTTPException(status_code=400, detail="Invalid PDF file format: missing %PDF header.")
    else:
        is_jpeg = header.startswith(b"\xff\xd8\xff")
        is_png = header.startswith(b"\x89PNG\r\n\x1a\n")
        is_webp = header.startswith(b"RIFF") and len(header) >= 12 and header[8:12] == b"WEBP"
        if not (is_jpeg or is_png or is_webp):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid {file_kind} image content. Only valid JPEG, PNG, and WebP files are accepted.",
            )


# ── Helpers ────────────────────────────────────────────────────────────────────

def _enrich(event: Event, viewer: Optional[User] = None) -> dict:
    """Inject presigned URLs into an Event ORM object dict and sanitize internal fields."""
    d = {c.name: getattr(event, c.name) for c in event.__table__.columns}
    d["coordinator"] = event.coordinator
    d["circular_url"] = get_presigned_url(event.circular_s3_key)
    d["poster_url"] = get_presigned_url(event.poster_s3_key)
    
    # Presign photo keys
    photos = []
    for p in (event.event_photos or []):
        url = get_presigned_url(p) if not str(p).startswith("http") else p
        photos.append(url or p)
    d["event_photos"] = photos

    # Strip internal coordinator/planning fields for non-managers
    is_manager = viewer and (viewer.role == "admin" or (viewer.role == "coordinator" and event.coordinator_id == viewer.id))
    if not is_manager:
        d["budget"] = None
        d["venue_permission_status"] = None
        d["concluding_remarks"] = None

    return d


def _get_event_or_404(event_id: str, db: Session) -> Event:
    event = db.execute(
        select(Event)
        .where(Event.id == event_id)
        .options(selectinload(Event.coordinator))
    ).scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


def _assert_can_manage(event: Event, user: User) -> None:
    """Admin can manage any event; coordinator only their own."""
    if user.role == "admin":
        return
    if user.role == "coordinator" and event.coordinator_id == user.id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to manage this event",
    )


# ── POST / ────────────────────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new event (Admin / Coordinator)",
)
async def create_event(
    # Form fields (multipart/form-data so files can be attached)
    title: Annotated[str, Form(min_length=2, max_length=255)],
    target_groups: Annotated[str, Form(description="JSON array e.g. [1,2]")],
    target_branches: Annotated[Optional[str], Form(description="JSON array e.g. [\"CC\", \"BS\"] or \"ALL\"")] = '["ALL"]',
    event_type: Annotated[Optional[str], Form()] = None,
    budget: Annotated[Optional[str], Form()] = None,
    venue_permission_status: Annotated[Optional[str], Form()] = "pending",
    judgment_criteria: Annotated[Optional[str], Form()] = None,
    prizes: Annotated[Optional[str], Form()] = None,
    description: Annotated[Optional[str], Form()] = None,
    rules: Annotated[Optional[str], Form()] = None,
    location: Annotated[Optional[str], Form(max_length=255)] = None,
    event_date: Annotated[Optional[str], Form(description="ISO-8601 datetime")] = None,
    max_participants: Annotated[Optional[int], Form(ge=1)] = None,
    status: Annotated[Optional[str], Form(description="Event status: open, draft, etc.")] = "open",
    circular: Annotated[Optional[UploadFile], File(description="PDF circular")] = None,
    poster: Annotated[Optional[UploadFile], File(description="Image poster")] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
) -> EventResponse:
    # Parse target_groups JSON string → list[int]
    try:
        if isinstance(target_groups, str):
            tg_str = target_groups.strip()
            if tg_str.startswith("["):
                tg = json.loads(tg_str)
            else:
                tg = [int(x.strip()) for x in tg_str.split(",") if x.strip()]
        else:
            tg = list(target_groups)

        if not isinstance(tg, list) or not all(isinstance(x, int) and 1 <= x <= 4 for x in tg):
            raise ValueError
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=422,
            detail="target_groups must be a JSON array of integers 1–4, e.g. [1,2]",
        )

    # Parse target_branches
    branches = ["ALL"]
    if target_branches:
        tb_str = target_branches.strip()
        if tb_str.startswith("["):
            try:
                branches = json.loads(tb_str)
            except Exception:
                branches = [tb_str]
        else:
            branches = [b.strip() for b in tb_str.split(",") if b.strip()]

    # Parse event_date
    parsed_date = None
    if event_date:
        from datetime import datetime
        try:
            parsed_date = datetime.fromisoformat(event_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid event_date format; use ISO-8601")

    # Upload files
    circular_key: str | None = None
    poster_key: str | None = None

    if circular and circular.filename:
        _validate_uploaded_file(circular, ALLOWED_CIRCULAR_EXTS, MAX_CIRCULAR_BYTES, "circular")
        circular_key = build_key("circulars", circular.filename)
        upload_file(circular.file, circular_key, circular.content_type or "application/pdf")

    if poster and poster.filename:
        _validate_uploaded_file(poster, ALLOWED_IMAGE_EXTS, MAX_IMAGE_BYTES, "poster")
        poster_key = build_key("posters", poster.filename)
        upload_file(poster.file, poster_key, poster.content_type or "image/jpeg")

    event_status = status if status in ("draft", "open", "live", "concluded") else "open"

    event = Event(
        title=title,
        description=description,
        target_groups=tg,
        target_branches=branches,
        event_type=event_type,
        budget=budget,
        venue_permission_status=venue_permission_status or "pending",
        judgment_criteria=judgment_criteria,
        prizes=prizes,
        concluding_remarks=None,
        event_photos=[],
        rules=rules,
        location=location,
        event_date=parsed_date,
        max_participants=max_participants,
        circular_s3_key=circular_key,
        poster_s3_key=poster_key,
        coordinator_id=current_user.id if current_user.role == "coordinator" else None,
        status=event_status,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # Load coordinator relationship
    db.refresh(event, attribute_names=["coordinator"])
    return _enrich(event, current_user)


# ── GET / ─────────────────────────────────────────────────────────────────────

@router.get(
    "/",
    response_model=list[EventListResponse],
    summary="List events (filtered by target_group for students; public sees open/live/concluded)",
)
def list_events(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> list[dict]:
    stmt = select(Event)

    # Admin and coordinator can view all events (draft, open, live, concluded)
    if current_user and current_user.role in ("admin", "coordinator"):
        pass
    # Public visitors and students see all open, live, and concluded events
    else:
        stmt = stmt.where(Event.status.in_(["open", "live", "concluded"]))

    events = db.execute(stmt.order_by(Event.created_at.desc())).scalars().all()

    return [
        {
            "id": e.id,
            "title": e.title,
            "description": e.description,
            "target_groups": e.target_groups or [],
            "target_branches": e.target_branches or ["ALL"],
            "event_type": e.event_type,
            "location": e.location,
            "event_date": e.event_date,
            "status": e.status,
            "coordinator_id": e.coordinator_id,
            "poster_url": get_presigned_url(e.poster_s3_key),
        }
        for e in events
    ]


# ── GET /{event_id} ───────────────────────────────────────────────────────────

@router.get(
    "/{event_id}",
    response_model=EventResponse,
    summary="Get full event details with presigned circular/poster/photo URLs",
)
def get_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> dict:
    event = _get_event_or_404(event_id, db)

    # Draft events are strictly restricted to the event creator or admin
    if event.status == "draft":
        is_owner_or_admin = current_user and (
            current_user.role == "admin" or event.coordinator_id == current_user.id
        )
        if not is_owner_or_admin:
            raise HTTPException(status_code=404, detail="Event not found")

    # If student: only view events open to their group
    if current_user and current_user.role == "student" and current_user.target_group:
        tg = event.target_groups or []
        if current_user.target_group not in tg:
            raise HTTPException(status_code=403, detail="This event is not available for your group")

    return _enrich(event, current_user)


# ── PATCH /{event_id}/guidelines ──────────────────────────────────────────────

@router.patch(
    "/{event_id}/guidelines",
    response_model=EventResponse,
    summary="Update event rules, location, budget, criteria, prizes, etc. (Admin / Assigned Coordinator)",
)
def update_guidelines(
    event_id: str,
    payload: EventGuidelinesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
) -> dict:
    event = _get_event_or_404(event_id, db)
    _assert_can_manage(event, current_user)

    if payload.rules is not None:
        event.rules = payload.rules
    if payload.location is not None:
        event.location = payload.location
    if payload.max_participants is not None:
        event.max_participants = payload.max_participants
    if payload.event_type is not None:
        event.event_type = payload.event_type
    if payload.budget is not None:
        event.budget = payload.budget
    if payload.venue_permission_status is not None:
        event.venue_permission_status = payload.venue_permission_status
    if payload.judgment_criteria is not None:
        event.judgment_criteria = payload.judgment_criteria
    if payload.prizes is not None:
        event.prizes = payload.prizes
    if payload.concluding_remarks is not None:
        event.concluding_remarks = payload.concluding_remarks

    db.commit()
    db.refresh(event)
    db.refresh(event, attribute_names=["coordinator"])
    return _enrich(event, current_user)


# ── PATCH /{event_id}/status ──────────────────────────────────────────────────

@router.patch(
    "/{event_id}/status",
    response_model=EventResponse,
    summary="Advance event status (draft→open→live→concluded)",
)
def update_status(
    event_id: str,
    payload: EventStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
) -> dict:
    event = _get_event_or_404(event_id, db)
    _assert_can_manage(event, current_user)

    try:
        EventStatusUpdate.validate_transition(event.status, payload.status)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    event.status = payload.status
    db.commit()
    db.refresh(event)
    db.refresh(event, attribute_names=["coordinator"])
    return _enrich(event, current_user)


# ── POST /{event_id}/photos ───────────────────────────────────────────────────

@router.post(
    "/{event_id}/photos",
    summary="Upload event conduction photos (Admin / Coordinator)",
)
async def upload_event_photos(
    event_id: str,
    photos: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "coordinator")),
):
    event = _get_event_or_404(event_id, db)
    _assert_can_manage(event, current_user)

    uploaded_keys = list(event.event_photos or [])
    for photo in photos:
        if photo.filename:
            _validate_uploaded_file(photo, ALLOWED_IMAGE_EXTS, MAX_IMAGE_BYTES, "photo")
            key = build_key(f"events/{event_id}/photos", photo.filename)
            upload_file(photo.file, key, photo.content_type or "image/jpeg")
            uploaded_keys.append(key)

    event.event_photos = uploaded_keys
    db.commit()
    db.refresh(event)

    presigned_photos = [get_presigned_url(k) or k for k in uploaded_keys]
    return {
        "event_id": event.id,
        "event_photos": presigned_photos,
    }


# ── POST /{event_id}/feedback ─────────────────────────────────────────────────

@router.post(
    "/{event_id}/feedback",
    response_model=FeedbackResponse,
    summary="Submit student feedback for an event",
)
def submit_feedback(
    event_id: str,
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = _get_event_or_404(event_id, db)

    if event.status != "concluded":
        raise HTTPException(
            status_code=400,
            detail="Feedback can only be submitted after the event has concluded.",
        )

    # Check registration and verified attendance
    reg = db.execute(
        select(Registration)
        .where(
            Registration.event_id == event_id,
            Registration.user_id == current_user.id,
        )
        .options(selectinload(Registration.attendance))
    ).scalar_one_or_none()

    if not reg and current_user.role == "student":
        raise HTTPException(
            status_code=403,
            detail="You must be registered for this event to submit feedback.",
        )

    if current_user.role == "student" and (not reg.attendance or not reg.attendance.is_present):
        raise HTTPException(
            status_code=403,
            detail="Only participants marked present for this event may submit feedback.",
        )

    # Check if existing feedback
    existing_fb = db.execute(
        select(Feedback).where(
            Feedback.event_id == event_id,
            Feedback.user_id == current_user.id,
        )
    ).scalar_one_or_none()

    if existing_fb:
        existing_fb.rating = payload.rating
        existing_fb.comment = payload.comment
        db.commit()
        db.refresh(existing_fb)
        return FeedbackResponse(
            id=existing_fb.id,
            event_id=existing_fb.event_id,
            user_id=existing_fb.user_id,
            user_name=current_user.name,
            rating=existing_fb.rating,
            comment=existing_fb.comment,
            created_at=existing_fb.created_at,
        )

    fb = Feedback(
        event_id=event_id,
        user_id=current_user.id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)

    return FeedbackResponse(
        id=fb.id,
        event_id=fb.event_id,
        user_id=fb.user_id,
        user_name=current_user.name,
        rating=fb.rating,
        comment=fb.comment,
        created_at=fb.created_at,
    )


# ── GET /{event_id}/feedback ──────────────────────────────────────────────────

@router.get(
    "/{event_id}/feedback",
    summary="Get all submitted student feedback for an event",
)
def get_event_feedback(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = _get_event_or_404(event_id, db)
    feedbacks = db.execute(
        select(Feedback)
        .where(Feedback.event_id == event_id)
        .options(selectinload(Feedback.user))
        .order_by(Feedback.created_at.desc())
    ).scalars().all()

    avg_rating = round(sum(f.rating for f in feedbacks) / len(feedbacks), 1) if feedbacks else 0.0

    is_manager = current_user.role == "admin" or (
        current_user.role == "coordinator" and event.coordinator_id == current_user.id
    )

    return {
        "average_rating": avg_rating,
        "count": len(feedbacks),
        "feedbacks": [
            {
                "id": f.id,
                "event_id": f.event_id,
                "user_id": f.user_id if is_manager else None,
                "user_name": (f.user.name if f.user else "Anonymous") if is_manager else "Verified Attendee",
                "rating": f.rating,
                "comment": f.comment,
                "created_at": f.created_at.isoformat() if f.created_at else None,
            }
            for f in feedbacks
        ],
    }
