import enum
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Text, Float, Enum, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.session import ExamSession
    from app.models.question import QuestionBank


class EvaluationType(str, enum.Enum):
    AUTO = "auto"
    AI = "ai"
    EXAMINER = "examiner"


class Result(Base):
    __tablename__ = "results"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[int] = mapped_column(ForeignKey("question_bank.id", ondelete="CASCADE"), nullable=False)
    score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    max_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    evaluation_type: Mapped[EvaluationType] = mapped_column(
        Enum(EvaluationType, name="evaluation_type", native_enum=False),
        nullable=False
    )
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    session: Mapped["ExamSession"] = relationship("ExamSession", back_populates="results")
    question: Mapped["QuestionBank"] = relationship("QuestionBank")
