import enum
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Enum, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.exam import Exam
    from app.models.answer import Answer
    from app.models.result import Result
    from app.models.proctor_event import ProctorEvent


class SessionStatus(str, enum.Enum):
    ACTIVE = "active"
    SUBMITTED = "submitted"
    EXPIRED = "expired"
    PUBLISHED = "published"
    DISQUALIFIED = "disqualified"


class ExamSession(Base):
    __tablename__ = "exam_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_token: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus, name="session_status", native_enum=False),
        nullable=False,
        default=SessionStatus.ACTIVE
    )
    suspicion_score: Mapped[Optional[float]] = mapped_column(nullable=True, default=0.0)


    # Relationships
    exam: Mapped["Exam"] = relationship("Exam", back_populates="sessions")
    student: Mapped["User"] = relationship("User", back_populates="exam_sessions")
    answers: Mapped[List["Answer"]] = relationship("Answer", back_populates="session", cascade="all, delete-orphan")
    results: Mapped[List["Result"]] = relationship("Result", back_populates="session", cascade="all, delete-orphan")
    proctor_events: Mapped[List["ProctorEvent"]] = relationship("ProctorEvent", back_populates="session", cascade="all, delete-orphan")
