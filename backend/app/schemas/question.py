from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.question import QuestionType

class OptionCreate(BaseModel):
    option_text: str
    is_correct: bool = False

class OptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_id: int
    option_text: str
    is_correct: bool

class QuestionCreate(BaseModel):
    question_text: str
    question_type: QuestionType
    subject: Optional[str] = None
    difficulty: Optional[str] = "MEDIUM"
    model_answer: Optional[str] = None
    marks: float = 1.0
    negative_marks: float = 0.0
    options: Optional[List[OptionCreate]] = []

class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    question_type: Optional[QuestionType] = None
    subject: Optional[str] = None
    difficulty: Optional[str] = None
    model_answer: Optional[str] = None
    marks: Optional[float] = None
    negative_marks: Optional[float] = None
    options: Optional[List[OptionCreate]] = None

class QuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_text: str
    question_type: QuestionType
    subject: Optional[str]
    difficulty: Optional[str]
    model_answer: Optional[str]
    marks: float
    negative_marks: float
    created_by: int
    created_at: datetime
    options: List[OptionResponse] = []
