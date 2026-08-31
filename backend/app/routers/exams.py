from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.exam import Exam, ExamQuestion
from app.models.question import QuestionBank
from app.schemas.exam import ExamCreate, ExamUpdate, ExamQuestionAdd, ExamResponse

router = APIRouter(prefix="/exams", tags=["Exam Configuration"])

@router.post("", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
def create_exam(
    data: ExamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("examiner", "admin"))
):
    """
    Create a new Exam configuration (Examiner & Admin only).
    """
    new_exam = Exam(
        title=data.title,
        subject=data.subject,
        duration_minutes=data.duration_minutes,
        randomization_enabled=data.randomization_enabled,
        negative_marking_enabled=data.negative_marking_enabled,
        start_time=data.start_time,
        end_time=data.end_time,
        proctoring_enabled=data.proctoring_enabled,
        gaze_sensitivity=data.gaze_sensitivity,
        max_tab_switch_warnings=data.max_tab_switch_warnings,
        created_by=current_user.id
    )
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    return new_exam

@router.get("", response_model=List[ExamResponse])
def list_exams(
    subject: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all configured exams.
    """
    query = db.query(Exam)
    if subject:
        query = query.filter(Exam.subject.ilike(f"%{subject}%"))
    return query.order_by(Exam.created_at.desc()).all()

@router.get("/{exam_id}", response_model=ExamResponse)
def get_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get exam details including configured questions.
    """
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found."
        )
    return exam

@router.put("/{exam_id}", response_model=ExamResponse)
def update_exam(
    exam_id: int,
    data: ExamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("examiner", "admin"))
):
    """
    Update an exam configuration (Examiner & Admin only).
    """
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found."
        )

    if current_user.role == UserRole.EXAMINER and exam.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update exams that you created."
        )

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(exam, field, val)

    db.commit()
    db.refresh(exam)
    return exam

@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("examiner", "admin"))
):
    """
    Delete an exam configuration (Examiner & Admin only).
    """
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found."
        )

    if current_user.role == UserRole.EXAMINER and exam.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete exams that you created."
        )

    db.delete(exam)
    db.commit()
    return None

@router.post("/{exam_id}/questions", response_model=ExamResponse)
def add_question_to_exam(
    exam_id: int,
    data: ExamQuestionAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("examiner", "admin"))
):
    """
    Attach a question from Question Bank to an Exam (Examiner & Admin only).
    """
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail=f"Exam ID {exam_id} not found.")

    question = db.query(QuestionBank).filter(QuestionBank.id == data.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail=f"Question ID {data.question_id} not found.")

    existing_eq = db.query(ExamQuestion).filter(
        ExamQuestion.exam_id == exam_id,
        ExamQuestion.question_id == data.question_id
    ).first()

    if existing_eq:
        existing_eq.question_order = data.question_order
    else:
        new_eq = ExamQuestion(
            exam_id=exam_id,
            question_id=data.question_id,
            question_order=data.question_order
        )
        db.add(new_eq)

    exam.question_count = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).count() + (0 if existing_eq else 1)
    db.commit()
    db.refresh(exam)
    return exam

@router.delete("/{exam_id}/questions/{question_id}", response_model=ExamResponse)
def remove_question_from_exam(
    exam_id: int,
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("examiner", "admin"))
):
    """
    Detach a question from an Exam (Examiner & Admin only).
    """
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail=f"Exam ID {exam_id} not found.")

    eq = db.query(ExamQuestion).filter(
        ExamQuestion.exam_id == exam_id,
        ExamQuestion.question_id == question_id
    ).first()

    if not eq:
        raise HTTPException(status_code=404, detail="Question is not attached to this exam.")

    db.delete(eq)
    exam.question_count = max(0, db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).count() - 1)
    db.commit()
    db.refresh(exam)
    return exam
