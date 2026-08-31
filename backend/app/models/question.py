import enum
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Float, Enum, DateTime, ForeignKey, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.exam import ExamQuestion


class QuestionType(str, enum.Enum):
    MCQ = "MCQ"
    MULTI_SELECT = "MULTI_SELECT"
    SHORT_ANSWER = "SHORT_ANSWER"
    LONG_ANSWER = "LONG_ANSWER"
    IMAGE_UPLOAD = "IMAGE_UPLOAD"


class QuestionBank(Base):
    __tablename__ = "question_bank"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[QuestionType] = mapped_column(
        Enum(QuestionType, name="question_type", native_enum=False),
        nullable=False
    )
    subject: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    difficulty: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    model_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    marks: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    negative_marks: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
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
    creator: Mapped["User"] = relationship("User", back_populates="questions_created")
    options: Mapped[List["Option"]] = relationship("Option", back_populates="question", cascade="all, delete-orphan")
    exam_questions: Mapped[List["ExamQuestion"]] = relationship("ExamQuestion", back_populates="question", cascade="all, delete-orphan")


class Option(Base):
    __tablename__ = "options"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("question_bank.id", ondelete="CASCADE"), nullable=False)
    option_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    question: Mapped["QuestionBank"] = relationship("QuestionBank", back_populates="options")
