from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.question import QuestionResponse

class ExamStartRequest(BaseModel):
    exam_id: int

class ExamStartResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: int
    exam_id: int
    student_id: int
    session_token: str
    started_at: datetime
    expires_at: datetime
    time_remaining_seconds: int
    questions: List[QuestionResponse] = []

class AnswerSubmitRequest(BaseModel):
    question_id: int
    selected_option_id: Optional[int] = None
    answer_text: Optional[str] = None
    image_path: Optional[str] = None

class AnswerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    question_id: int
    selected_option_id: Optional[int]
    answer_text: Optional[str]
    image_path: Optional[str]
    submitted_at: datetime

class QuestionResultResponse(BaseModel):
    question_id: int
    question_text: str
    question_type: str
    score: float
    max_score: float
    evaluation_type: str
    feedback: Optional[str]

class ExamSubmitResponse(BaseModel):
    session_id: int
    status: str
    total_score: float
    max_score: float
    auto_graded_count: int
    llm_evaluated_count: int
    results: List[QuestionResultResponse] = []

class ExaminerGradeItem(BaseModel):
    question_id: int
    score: float
    feedback: Optional[str] = None

class ExaminerGradeRequest(BaseModel):
    grades: List[ExaminerGradeItem]

class IntegrityDecisionRequest(BaseModel):
    decision: str  # 'publish' or 'disqualify'
    reason: Optional[str] = None

