from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.dependencies.auth import get_current_user, require_examiner_only, require_role
from app.models.user import User, UserRole
from app.models.question import QuestionBank, Option, QuestionType
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionResponse
from app.services.pdf_extractor import parse_questions_from_pdf

router = APIRouter(prefix="/questions", tags=["Question Bank"])

@router.post("", response_model=QuestionResponse, status_code=status.HTTP_213_CREATED if hasattr(status, 'HTTP_213_CREATED') else status.HTTP_201_CREATED)
def create_question(
    data: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("examiner", "admin"))
):
    """
    Create a new question in the Question Bank (Examiner & Admin only).
    """
    new_question = QuestionBank(
        question_text=data.question_text,
        question_type=data.question_type,
        subject=data.subject,
        difficulty=data.difficulty,
        model_answer=data.model_answer,
        marks=data.marks,
        negative_marks=data.negative_marks,
        created_by=current_user.id
    )
    db.add(new_question)
    db.flush()

    if data.options:
        for opt in data.options:
            new_option = Option(
                question_id=new_question.id,
                option_text=opt.option_text,
                is_correct=opt.is_correct
            )
            db.add(new_option)

    db.commit()
    db.refresh(new_question)
    return new_question

@router.get("", response_model=List[QuestionResponse])
def list_questions(
    subject: Optional[str] = None,
    difficulty: Optional[str] = None,
    question_type: Optional[QuestionType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List questions in the Question Bank with optional subject, difficulty, or question_type filters.
    """
    query = db.query(QuestionBank)
    if subject:
        query = query.filter(QuestionBank.subject.ilike(f"%{subject}%"))
    if difficulty:
        query = query.filter(QuestionBank.difficulty == difficulty.upper())
    if question_type:
        query = query.filter(QuestionBank.question_type == question_type)

    results = query.order_by(QuestionBank.created_at.desc()).all()
    if current_user.role == UserRole.STUDENT:
        sanitized = []
        for q in results:
            opts = [{"id": o.id, "question_id": o.question_id, "option_text": o.option_text, "is_correct": False} for o in (q.options or [])]
            sanitized.append(QuestionResponse(
                id=q.id,
                question_text=q.question_text,
                question_type=q.question_type,
                subject=q.subject,
                difficulty=q.difficulty,
                model_answer=None,
                marks=q.marks,
                negative_marks=q.negative_marks,
                created_by=q.created_by,
                created_at=q.created_at,
                options=opts
            ))
        return sanitized
    return results

@router.get("/{question_id}", response_model=QuestionResponse)
def get_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a single question by ID (Rubrics restricted to Examiner & Admin).
    """
    if current_user.role == UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students cannot access Question Bank rubrics directly."
        )

    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question with ID {question_id} not found."
        )
    return question


@router.put("/{question_id}", response_model=QuestionResponse)
def update_question(
    question_id: int,
    data: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("examiner", "admin"))
):
    """
    Update a question in the Question Bank (Examiner & Admin only).
    """
    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question with ID {question_id} not found."
        )

    if current_user.role == UserRole.EXAMINER and question.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update questions that you created."
        )

    if data.question_text is not None:
        question.question_text = data.question_text
    if data.question_type is not None:
        question.question_type = data.question_type
    if data.subject is not None:
        question.subject = data.subject
    if data.difficulty is not None:
        question.difficulty = data.difficulty
    if data.model_answer is not None:
        question.model_answer = data.model_answer
    if data.marks is not None:
        question.marks = data.marks
    if data.negative_marks is not None:
        question.negative_marks = data.negative_marks

    if data.options is not None:
        db.query(Option).filter(Option.question_id == question_id).delete()
        for opt in data.options:
            new_option = Option(
                question_id=question.id,
                option_text=opt.option_text,
                is_correct=opt.is_correct
            )
            db.add(new_option)

    db.commit()
    db.refresh(question)
    return question

@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("examiner", "admin"))
):
    """
    Delete a question from the Question Bank (Examiner & Admin only).
    """
    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question with ID {question_id} not found."
        )

    if current_user.role == UserRole.EXAMINER and question.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete questions that you created."
        )

    db.delete(question)
    db.commit()
    return None

@router.post("/extract-pdf")
async def extract_questions_from_pdf_file(
    file: UploadFile = File(...),
    subject: Optional[str] = Form("General"),
    current_user: User = Depends(require_role("examiner", "admin"))
):
    """
    Extracts questions, options, and model answers from an uploaded question paper PDF (Examiner & Admin only).
    Returns parsed structured questions for interactive preview and verification before saving.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files (.pdf) are supported.")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded PDF file is empty.")

    questions = parse_questions_from_pdf(content, default_subject=subject or "General")
    if not questions:
        raise HTTPException(status_code=422, detail="No readable questions could be extracted from this PDF. Please check that the PDF contains selectable text.")

    return {
        "filename": file.filename,
        "extracted_count": len(questions),
        "questions": questions
    }

@router.post("/batch", response_model=List[QuestionResponse], status_code=status.HTTP_201_CREATED)
def batch_create_questions(
    questions: List[QuestionCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("examiner", "admin"))
):
    """
    Batch-creates multiple questions into the Question Bank in a single atomic transaction (Examiner & Admin only).
    """
    if not questions:
        raise HTTPException(status_code=400, detail="Question list cannot be empty.")

    created_questions = []
    for data in questions:
        new_q = QuestionBank(
            question_text=data.question_text,
            question_type=data.question_type,
            subject=data.subject,
            difficulty=data.difficulty or "MEDIUM",
            model_answer=data.model_answer,
            marks=data.marks,
            negative_marks=data.negative_marks,
            created_by=current_user.id
        )
        db.add(new_q)
        db.flush()

        if data.options:
            for opt in data.options:
                new_opt = Option(
                    question_id=new_q.id,
                    option_text=opt.option_text,
                    is_correct=opt.is_correct
                )
                db.add(new_opt)

        created_questions.append(new_q)

    db.commit()
    for q in created_questions:
        db.refresh(q)

    return created_questions
