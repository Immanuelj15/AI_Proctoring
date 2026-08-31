import enum
from datetime import datetime
from typing import List, TYPE_CHECKING
from sqlalchemy import String, Enum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.question import QuestionBank
    from app.models.exam import Exam
    from app.models.session import ExamSession


class UserRole(str, enum.Enum):
    STUDENT = "student"
    EXAMINER = "examiner"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=False),
        nullable=False,
        default=UserRole.STUDENT
    )
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
    questions_created: Mapped[List["QuestionBank"]] = relationship("QuestionBank", back_populates="creator", cascade="all, delete-orphan")
    exams_created: Mapped[List["Exam"]] = relationship("Exam", back_populates="creator", cascade="all, delete-orphan")
    exam_sessions: Mapped[List["ExamSession"]] = relationship("ExamSession", back_populates="student", cascade="all, delete-orphan")
