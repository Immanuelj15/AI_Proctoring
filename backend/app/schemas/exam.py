from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.question import QuestionResponse

class ExamCreate(BaseModel):
    title: str
    subject: Optional[str] = None
    duration_minutes: int
    randomization_enabled: bool = False
    negative_marking_enabled: bool = False
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    proctoring_enabled: bool = True
    gaze_sensitivity: str = "medium"
    max_tab_switch_warnings: int = 3

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    duration_minutes: Optional[int] = None
    randomization_enabled: Optional[bool] = None
    negative_marking_enabled: Optional[bool] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    proctoring_enabled: Optional[bool] = None
    gaze_sensitivity: Optional[str] = None
    max_tab_switch_warnings: Optional[int] = None

class ExamQuestionAdd(BaseModel):
    question_id: int
    question_order: int = 1

class ExamQuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exam_id: int
    question_id: int
    question_order: int
    question: Optional[QuestionResponse] = None

class ExamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    subject: Optional[str]
    duration_minutes: int
    question_count: int
    randomization_enabled: bool
    negative_marking_enabled: bool
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    proctoring_enabled: bool
    gaze_sensitivity: str
    max_tab_switch_warnings: int
    created_by: int
    created_at: datetime
    exam_questions: List[ExamQuestionResponse] = []
