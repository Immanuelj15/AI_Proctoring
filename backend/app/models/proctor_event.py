import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base

class ProctorEventType(str, enum.Enum):
    FACE_ABSENT = "FACE_ABSENT"
    MULTIPLE_FACES = "MULTIPLE_FACES"
    OFF_SCREEN_GAZE = "OFF_SCREEN_GAZE"
    TAB_SWITCH = "TAB_SWITCH"
    FULLSCREEN_EXIT = "FULLSCREEN_EXIT"

class ProctorEvent(Base):
    __tablename__ = "proctor_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(Enum(ProctorEventType, native_enum=False), nullable=False)
    suspicion_increment = Column(Float, default=5.0, nullable=False)
    snapshot_url = Column(String(500), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    session = relationship("ExamSession", back_populates="proctor_events")
