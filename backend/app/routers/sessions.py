import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.exam import Exam, ExamQuestion
from app.models.question import QuestionBank, Option, QuestionType
from app.models.session import ExamSession, SessionStatus
from app.models.answer import Answer
from app.models.result import Result, EvaluationType
from app.schemas.session import (
    ExamStartRequest,
    ExamStartResponse,
    AnswerSubmitRequest,
    AnswerResponse,
    ExamSubmitResponse,
    QuestionResultResponse,
)
from app.services.llm_grading import evaluate_subjective_answer
from app.services.ocr import extract_text_from_image

router = APIRouter(prefix="/exam-sessions", tags=["Exam Session Engine"])

def make_aware(dt: Optional[datetime]) -> datetime:
    if dt is None:
        return datetime.now(timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

@router.post("/start", response_model=ExamStartResponse, status_code=status.HTTP_201_CREATED)
def start_exam_session(
    data: ExamStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Start a timed exam session. Binds student_id to exam_id via unique session token.
    Enforces server-side time limits and returns randomized question paper.
    """
    exam = db.query(Exam).filter(Exam.id == data.exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail=f"Exam ID {data.exam_id} not found.")

    existing_session = db.query(ExamSession).filter(
        ExamSession.exam_id == data.exam_id,
        ExamSession.student_id == current_user.id,
        ExamSession.status == SessionStatus.ACTIVE
    ).first()

    now = datetime.now(timezone.utc)

    if existing_session:
        session_expires = make_aware(existing_session.expires_at)
        if session_expires <= now:
            existing_session.status = SessionStatus.EXPIRED
            db.commit()
        else:
            time_remaining = int((session_expires - now).total_seconds())
            exam_q_list = db.query(ExamQuestion).filter(ExamQuestion.exam_id == data.exam_id).order_by(ExamQuestion.question_order).all()
            q_ids = [eq.question_id for eq in exam_q_list]
            questions = db.query(QuestionBank).filter(QuestionBank.id.in_(q_ids)).all() if q_ids else []

            return ExamStartResponse(
                session_id=existing_session.id,
                exam_id=existing_session.exam_id,
                student_id=existing_session.student_id,
                session_token=existing_session.session_token,
                started_at=existing_session.started_at,
                expires_at=existing_session.expires_at,
                time_remaining_seconds=time_remaining,
                questions=questions
            )

    # Create new session
    session_token = f"sess_{uuid.uuid4().hex[:16]}"
    expires_at = now + timedelta(minutes=exam.duration_minutes)

    new_session = ExamSession(
        exam_id=exam.id,
        student_id=current_user.id,
        session_token=session_token,
        started_at=now,
        expires_at=expires_at,
        status=SessionStatus.ACTIVE
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    exam_q_list = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam.id).order_by(ExamQuestion.question_order).all()
    q_ids = [eq.question_id for eq in exam_q_list]
    questions = db.query(QuestionBank).filter(QuestionBank.id.in_(q_ids)).all() if q_ids else []

    if exam.randomization_enabled and questions:
        rng = random.Random(current_user.id)
        rng.shuffle(questions)

    session_expires = make_aware(new_session.expires_at)
    time_remaining = int((session_expires - now).total_seconds())

    return ExamStartResponse(
        session_id=new_session.id,
        exam_id=new_session.exam_id,
        student_id=new_session.student_id,
        session_token=new_session.session_token,
        started_at=new_session.started_at,
        expires_at=new_session.expires_at,
        time_remaining_seconds=time_remaining,
        questions=questions
    )

@router.get("/{session_id}/time-remaining")
def get_session_time_remaining(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns server-side remaining session time in seconds.
    """
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    now = datetime.now(timezone.utc)
    expires_at = make_aware(session.expires_at)
    remaining = max(0, int((expires_at - now).total_seconds()))

    if remaining == 0 and session.status == SessionStatus.ACTIVE:
        session.status = SessionStatus.EXPIRED
        db.commit()

    return {
        "session_id": session.id,
        "status": session.status,
        "time_remaining_seconds": remaining
    }

@router.post("/{session_id}/answers", response_model=AnswerResponse)
def submit_question_answer(
    session_id: int,
    data: AnswerSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if session.status != SessionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Cannot submit answer to a completed or expired session.")

    existing_answer = db.query(Answer).filter(
        Answer.session_id == session_id,
        Answer.question_id == data.question_id
    ).first()

    if existing_answer:
        existing_answer.selected_option_id = data.selected_option_id
        existing_answer.answer_text = data.answer_text
        existing_answer.image_path = data.image_path
        db.commit()
        db.refresh(existing_answer)
        return existing_answer

    new_answer = Answer(
        session_id=session_id,
        question_id=data.question_id,
        selected_option_id=data.selected_option_id,
        answer_text=data.answer_text,
        image_path=data.image_path
    )
    db.add(new_answer)
    db.commit()
    db.refresh(new_answer)
    return new_answer

@router.post("/{session_id}/submit", response_model=ExamSubmitResponse)
def submit_exam_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if session.status in [SessionStatus.SUBMITTED, SessionStatus.EXPIRED]:
        existing_results = db.query(Result).filter(Result.session_id == session_id).all()
        result_responses = []
        total_s = 0.0
        max_s = 0.0
        for r in existing_results:
            total_s += r.score
            max_s += r.max_score
            result_responses.append(QuestionResultResponse(
                question_id=r.question_id,
                question_text=r.question.question_text,
                question_type=r.question.question_type,
                score=r.score,
                max_score=r.max_score,
                evaluation_type=r.evaluation_type,
                feedback=r.feedback
            ))
        return ExamSubmitResponse(
            session_id=session.id,
            status=session.status,
            total_score=round(total_s, 2),
            max_score=round(max_s, 2),
            auto_graded_count=len([r for r in existing_results if r.evaluation_type == EvaluationType.AUTO]),
            llm_evaluated_count=len([r for r in existing_results if r.evaluation_type == EvaluationType.AI]),
            results=result_responses
        )

    session.status = SessionStatus.SUBMITTED
    session.submitted_at = datetime.now(timezone.utc)

    answers = db.query(Answer).filter(Answer.session_id == session_id).all()
    results_list: List[Result] = []
    result_responses: List[QuestionResultResponse] = []
    total_score = 0.0
    total_max_score = 0.0
    auto_graded_count = 0
    llm_evaluated_count = 0

    for ans in answers:
        question = db.query(QuestionBank).filter(QuestionBank.id == ans.question_id).first()
        if not question:
            continue

        q_score = 0.0
        eval_type = EvaluationType.AUTO
        feedback_text = ""

        if question.question_type == QuestionType.MCQ:
            auto_graded_count += 1
            if ans.selected_option_id:
                correct_opt = db.query(Option).filter(Option.question_id == question.id, Option.is_correct == True).first()
                if correct_opt and ans.selected_option_id == correct_opt.id:
                    q_score = question.marks
                    feedback_text = "Correct answer!"
                else:
                    q_score = -abs(question.negative_marks) if question.negative_marks else 0.0
                    feedback_text = f"Incorrect. Negative marking deduction: -{abs(question.negative_marks)}"
            else:
                q_score = 0.0
                feedback_text = "Not attempted."

        elif question.question_type in [QuestionType.SHORT_ANSWER, QuestionType.LONG_ANSWER]:
            eval_type = EvaluationType.AI
            llm_evaluated_count += 1
            student_text = ans.answer_text or ""
            llm_res = evaluate_subjective_answer(
                question_text=question.question_text,
                model_answer=question.model_answer,
                student_response=student_text,
                max_marks=question.marks
            )
            q_score = llm_res.suggested_score
            feedback_text = f"{llm_res.justification} | Key Covered: {', '.join(llm_res.key_points_covered)}"

        elif question.question_type == QuestionType.IMAGE_UPLOAD:
            eval_type = EvaluationType.EXAMINER
            ocr_text = extract_text_from_image(ans.image_path) if ans.image_path else "No image uploaded"
            feedback_text = f"Queued for Examiner Review. OCR Extracted: {ocr_text}"
            q_score = 0.0

        res_record = Result(
            session_id=session_id,
            question_id=question.id,
            score=q_score,
            max_score=question.marks,
            evaluation_type=eval_type,
            feedback=feedback_text
        )
        db.add(res_record)
        results_list.append(res_record)

        total_score += q_score
        total_max_score += question.marks

        result_responses.append(QuestionResultResponse(
            question_id=question.id,
            question_text=question.question_text,
            question_type=question.question_type,
            score=round(q_score, 2),
            max_score=question.marks,
            evaluation_type=eval_type,
            feedback=feedback_text
        ))

    db.commit()

    return ExamSubmitResponse(
        session_id=session.id,
        status=session.status,
        total_score=round(total_score, 2),
        max_score=round(total_max_score, 2),
        auto_graded_count=auto_graded_count,
        llm_evaluated_count=llm_evaluated_count,
        results=result_responses
    )
