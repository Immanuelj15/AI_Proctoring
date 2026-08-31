from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.session import ExamSession
    from app.models.question import QuestionBank, Option


class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[int] = mapped_column(ForeignKey("question_bank.id", ondelete="CASCADE"), nullable=False)
    selected_option_id: Mapped[Optional[int]] = mapped_column(ForeignKey("options.id", ondelete="SET NULL"), nullable=True)
    answer_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    session: Mapped["ExamSession"] = relationship("ExamSession", back_populates="answers")
    question: Mapped["QuestionBank"] = relationship("QuestionBank")
    selected_option: Mapped[Optional["Option"]] = relationship("Option")
