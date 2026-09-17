from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.dependencies.auth import get_current_user, require_examiner_only, require_role
from app.models.user import User, UserRole
from app.models.question import QuestionBank, Option, QuestionType
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionResponse
from pydantic import BaseModel
from app.services.pdf_extractor import (
    parse_questions_from_pdf,
    extract_text_from_file,
    fetch_and_clean_web_content,
    generate_questions_with_distribution,
)

class ExtractUrlRequest(BaseModel):
    url: str
    subject: Optional[str] = "General"
    easy_count: Optional[int] = None
    medium_count: Optional[int] = None
    hard_count: Optional[int] = None
    question_types: Optional[List[str]] = None

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

@router.post("/extract-file")
async def extract_questions_from_file_upload(
    file: UploadFile = File(...),
    subject: Optional[str] = Form("General"),
    easy_count: Optional[int] = Form(None),
    medium_count: Optional[int] = Form(None),
    hard_count: Optional[int] = Form(None),
    question_types: Optional[str] = Form(None),
    current_user: User = Depends(require_role("examiner", "admin"))
):
    """
    Extracts or generates questions from PDF, Word (.docx), or Text files
    with optional difficulty distribution targets (Examiner & Admin only).
    """
    valid_exts = [".pdf", ".docx", ".txt", ".md"]
    if not any(file.filename.lower().endswith(ext) for ext in valid_exts):
        raise HTTPException(status_code=400, detail=f"Unsupported file format. Allowed formats: {', '.join(valid_exts)}")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    text = extract_text_from_file(content, file.filename)
    if not text.strip():
        raise HTTPException(status_code=422, detail="No readable text could be extracted from this document.")

    types_list = [t.strip() for t in question_types.split(",") if t.strip()] if question_types else None

    questions = generate_questions_with_distribution(
        raw_text=text,
        subject=subject or "General",
        easy_count=easy_count,
        medium_count=medium_count,
        hard_count=hard_count,
        allowed_types=types_list
    )

    if not questions:
        raise HTTPException(status_code=422, detail="No questions could be extracted or generated from this content.")

    return {
        "filename": file.filename,
        "source": file.filename,
        "extracted_count": len(questions),
        "questions": questions
    }

@router.post("/extract-pdf")
async def extract_questions_from_pdf_file(
    file: UploadFile = File(...),
    subject: Optional[str] = Form("General"),
    easy_count: Optional[int] = Form(None),
    medium_count: Optional[int] = Form(None),
    hard_count: Optional[int] = Form(None),
    question_types: Optional[str] = Form(None),
    current_user: User = Depends(require_role("examiner", "admin"))
):
    """
    Backward-compatible route for PDF extraction, supporting difficulty distribution.
    """
    return await extract_questions_from_file_upload(
        file=file,
        subject=subject,
        easy_count=easy_count,
        medium_count=medium_count,
        hard_count=hard_count,
        question_types=question_types,
        current_user=current_user
    )

@router.post("/extract-url")
async def extract_questions_from_web_url(
    payload: ExtractUrlRequest,
    current_user: User = Depends(require_role("examiner", "admin"))
):
    """
    Fetches an external website / article / syllabus URL, scrapes and cleans body text,
    and uses AI to generate structured questions matching the requested difficulty distribution (Examiner & Admin only).
    """
    if not payload.url or not payload.url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Please provide a valid web URL starting with http:// or https://")

    try:
        cleaned_text = await fetch_and_clean_web_content(payload.url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch content from URL: {str(e)}")

    if not cleaned_text.strip():
        raise HTTPException(status_code=422, detail="The webpage did not return sufficient readable text to generate questions.")

    questions = generate_questions_with_distribution(
        raw_text=cleaned_text,
        subject=payload.subject or "General",
        easy_count=payload.easy_count,
        medium_count=payload.medium_count,
        hard_count=payload.hard_count,
        allowed_types=payload.question_types
    )

    if not questions:
        raise HTTPException(status_code=422, detail="No questions could be generated from the webpage content.")

    return {
        "source": payload.url,
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
