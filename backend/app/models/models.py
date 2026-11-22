"""
ORM models for the CC-BS Events Portal.

Tables
------
users          – portal accounts (admin / coordinator / judge / student)
events         – event listings managed by coordinators
registrations  – team / individual sign-ups for events
attendance     – check-in record per registration
judgements     – scores & ranks assigned by judges
certificates   – issued participation / winner certificates
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    ARRAY,
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


# ── Helpers ────────────────────────────────────────────────────────────────────

def _uuid() -> str:
    return str(uuid.uuid4())


# ── users ──────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=_uuid
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    usn: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        Enum("admin", "coordinator", "judge", "student", name="user_role"),
        nullable=False,
        default="student",
    )
    target_group: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # relationships
    coordinated_events: Mapped[list["Event"]] = relationship(
        back_populates="coordinator", foreign_keys="Event.coordinator_id"
    )
    registrations: Mapped[list["Registration"]] = relationship(back_populates="user")
    attendances_marked: Mapped[list["Attendance"]] = relationship(
        back_populates="marked_by_user", foreign_keys="Attendance.marked_by"
    )
    judgements: Mapped[list["Judgement"]] = relationship(back_populates="judge")
    feedbacks: Mapped[list["Feedback"]] = relationship(back_populates="user")


# ── events ─────────────────────────────────────────────────────────────────────

class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=_uuid
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    circular_s3_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    poster_s3_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    target_groups: Mapped[list[int] | None] = mapped_column(
        ARRAY(Integer), nullable=True
    )
    target_branches: Mapped[list[str] | None] = mapped_column(JSON, nullable=True, default=lambda: ["ALL"])
    event_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    budget: Mapped[str | None] = mapped_column(String(100), nullable=True)
    venue_permission_status: Mapped[str | None] = mapped_column(String(50), nullable=True, default="pending")
    judgment_criteria: Mapped[str | None] = mapped_column(Text, nullable=True)
    prizes: Mapped[str | None] = mapped_column(Text, nullable=True)
    concluding_remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_photos: Mapped[list[str] | None] = mapped_column(JSON, nullable=True, default=list)
    rules: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    event_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    max_participants: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("draft", "open", "live", "concluded", name="event_status"),
        nullable=False,
        default="draft",
    )
    coordinator_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # relationships
    coordinator: Mapped["User | None"] = relationship(
        back_populates="coordinated_events", foreign_keys=[coordinator_id]
    )
    registrations: Mapped[list["Registration"]] = relationship(back_populates="event")
    judgements: Mapped[list["Judgement"]] = relationship(back_populates="event")
    feedbacks: Mapped[list["Feedback"]] = relationship(back_populates="event", cascade="all, delete-orphan")


# ── registrations ──────────────────────────────────────────────────────────────

class Registration(Base):
    __tablename__ = "registrations"
    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_registration_event_user"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=_uuid
    )
    event_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    team_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    team_members: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("pending", "confirmed", "cancelled", name="registration_status"),
        nullable=False,
        default="pending",
    )
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # relationships
    event: Mapped["Event"] = relationship(back_populates="registrations")
    user: Mapped["User"] = relationship(back_populates="registrations")
    attendance: Mapped["Attendance | None"] = relationship(
        back_populates="registration", uselist=False
    )
    judgement: Mapped["Judgement | None"] = relationship(
        back_populates="registration", uselist=False
    )
    certificate: Mapped["Certificate | None"] = relationship(
        back_populates="registration", uselist=False
    )


# ── attendance ─────────────────────────────────────────────────────────────────

class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=_uuid
    )
    registration_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("registrations.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    is_present: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    marked_by: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    check_in_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # relationships
    registration: Mapped["Registration"] = relationship(back_populates="attendance")
    marked_by_user: Mapped["User | None"] = relationship(
        back_populates="attendances_marked", foreign_keys=[marked_by]
    )


# ── judgements ─────────────────────────────────────────────────────────────────

class Judgement(Base):
    __tablename__ = "judgements"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=_uuid
    )
    event_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
    )
    registration_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("registrations.id", ondelete="CASCADE"),
        nullable=False,
    )
    judge_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    prize_details: Mapped[str | None] = mapped_column(Text, nullable=True)

    # relationships
    event: Mapped["Event"] = relationship(back_populates="judgements")
    registration: Mapped["Registration"] = relationship(back_populates="judgement")
    judge: Mapped["User"] = relationship(back_populates="judgements")


# ── certificates ───────────────────────────────────────────────────────────────

class Certificate(Base):
    __tablename__ = "certificates"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=_uuid
    )
    registration_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("registrations.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    cert_type: Mapped[str] = mapped_column(
        Enum("participation", "winner", name="cert_type"),
        nullable=False,
        default="participation",
    )
    verification_code: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False
    )
    s3_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # relationships
    registration: Mapped["Registration"] = relationship(back_populates="certificate")


# ── feedback ──────────────────────────────────────────────────────────────────

class Feedback(Base):
    __tablename__ = "feedbacks"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=_uuid
    )
    event_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # relationships
    event: Mapped["Event"] = relationship(back_populates="feedbacks")
    user: Mapped["User"] = relationship(back_populates="feedbacks")

