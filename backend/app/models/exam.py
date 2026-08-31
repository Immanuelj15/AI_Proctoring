from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.question import QuestionBank
    from app.models.session import ExamSession


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    randomization_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    negative_marking_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    proctoring_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    gaze_sensitivity: Mapped[str] = mapped_column(String(50), default="medium", nullable=False)
    max_tab_switch_warnings: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    creator: Mapped["User"] = relationship("User", back_populates="exams_created")
    exam_questions: Mapped[List["ExamQuestion"]] = relationship("ExamQuestion", back_populates="exam", cascade="all, delete-orphan")
    sessions: Mapped[List["ExamSession"]] = relationship("ExamSession", back_populates="exam", cascade="all, delete-orphan")


class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[int] = mapped_column(ForeignKey("question_bank.id", ondelete="CASCADE"), nullable=False)
    question_order: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relationships
    exam: Mapped["Exam"] = relationship("Exam", back_populates="exam_questions")
    question: Mapped["QuestionBank"] = relationship("QuestionBank", back_populates="exam_questions")
