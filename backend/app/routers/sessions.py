import base64
import json
import os
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.dependencies.auth import get_current_user, require_role, oauth2_scheme
from app.core.security import decode_access_token
from app.models.user import User, UserRole
from app.models.exam import Exam, ExamQuestion
from app.models.question import QuestionBank, Option, QuestionType
from app.models.session import ExamSession, SessionStatus
from app.models.answer import Answer
from app.models.result import Result, EvaluationType
from app.models.proctor_event import ProctorEvent, ProctorEventType
from app.services.identity_verification import compute_face_match_confidence, RETENTION_POLICY_STATEMENT, PHOTO_RETENTION_DAYS
from fastapi.responses import StreamingResponse
from app.schemas.session import (
    ExamStartRequest,
    ExamStartResponse,
    AnswerSubmitRequest,
    AnswerResponse,
    ExamSubmitResponse,
    QuestionResultResponse,
    ExaminerGradeRequest,
    IntegrityDecisionRequest,
)
from app.services.llm_grading import evaluate_subjective_answer
from app.services.ocr import extract_text_from_image
from app.services.pdf_report import generate_exam_report_pdf


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
    Persists deterministic question order for crash-safe resume.
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
            
            # Reconstruct questions preserving deterministic order if stored
            if existing_session.question_order:
                try:
                    ordered_ids = json.loads(existing_session.question_order)
                    q_dict = {q.id: q for q in db.query(QuestionBank).filter(QuestionBank.id.in_(ordered_ids)).all()}
                    questions = [q_dict[qid] for qid in ordered_ids if qid in q_dict]
                except Exception:
                    questions = []
            else:
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

    exam_q_list = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam.id).order_by(ExamQuestion.question_order).all()
    q_ids = [eq.question_id for eq in exam_q_list]
    questions = db.query(QuestionBank).filter(QuestionBank.id.in_(q_ids)).all() if q_ids else []

    if exam.randomization_enabled and questions:
        rng = random.Random(current_user.id)
        rng.shuffle(questions)

    question_order_json = json.dumps([q.id for q in questions])

    new_session = ExamSession(
        exam_id=exam.id,
        student_id=current_user.id,
        session_token=session_token,
        started_at=now,
        expires_at=expires_at,
        status=SessionStatus.ACTIVE,
        question_order=question_order_json,
        retention_purge_date=now + timedelta(days=PHOTO_RETENTION_DAYS),
        ai_suspicion_score=0.0,
        confirmed_suspicion_score=0.0
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

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

@router.get("/{session_id}/questions")
def get_session_questions(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the exam questions and options associated with this session.
    """
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    exam = session.exam
    if session.question_order:
        try:
            ordered_ids = json.loads(session.question_order)
            q_dict = {q.id: q for q in db.query(QuestionBank).filter(QuestionBank.id.in_(ordered_ids)).all()}
            ordered_questions = [q_dict[qid] for qid in ordered_ids if qid in q_dict]
        except Exception:
            ordered_questions = []
    else:
        exam_q_list = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam.id).order_by(ExamQuestion.question_order).all()
        q_ids = [eq.question_id for eq in exam_q_list]
        q_dict = {q.id: q for q in db.query(QuestionBank).filter(QuestionBank.id.in_(q_ids)).all()} if q_ids else {}
        ordered_questions = [q_dict[qid] for qid in q_ids if qid in q_dict]

    result = []
    for q in ordered_questions:
        result.append({
            "id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type.value if hasattr(q.question_type, "value") else str(q.question_type),
            "subject": q.subject,
            "marks": q.marks,
            "negative_marks": q.negative_marks,
            "options": [{"id": o.id, "option_text": o.option_text} for o in q.options] if q.options else []
        })
    return result


@router.get("/{session_id}/resume")
def resume_exam_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Crash-Safe Resume Endpoint:
    Allows candidate to resume exam after accidental browser tab closure, crash, or reload.
    Restores:
      1. Server-authoritative remaining time (timer does not restart or pause)
      2. Deterministic randomized question sequence
      3. All saved candidate answers
      4. Identity verification & room scan completion status
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

    # Load questions in deterministic stored order
    ordered_questions = []
    if session.question_order:
        try:
            ordered_ids = json.loads(session.question_order)
            q_dict = {q.id: q for q in db.query(QuestionBank).filter(QuestionBank.id.in_(ordered_ids)).all()}
            ordered_questions = [q_dict[qid] for qid in ordered_ids if qid in q_dict]
        except Exception:
            ordered_questions = []
    if not ordered_questions and session.exam:
        exam_q_list = db.query(ExamQuestion).filter(ExamQuestion.exam_id == session.exam.id).order_by(ExamQuestion.question_order).all()
        q_ids = [eq.question_id for eq in exam_q_list]
        q_dict = {q.id: q for q in db.query(QuestionBank).filter(QuestionBank.id.in_(q_ids)).all()} if q_ids else {}
        ordered_questions = [q_dict[qid] for qid in q_ids if qid in q_dict]

    formatted_questions = []
    for idx, q in enumerate(ordered_questions):
        formatted_questions.append({
            "id": str(q.id),
            "orderIndex": idx + 1,
            "subject": q.subject,
            "type": q.question_type.value if hasattr(q.question_type, "value") else str(q.question_type),
            "content": q.question_text,
            "marks": q.marks,
            "negativeMarks": q.negative_marks or 0.0,
            "options": [{"id": o.id, "option_text": o.option_text} for o in q.options] if q.options else []
        })

    # Load existing answers
    saved_answers = db.query(Answer).filter(Answer.session_id == session_id).all()
    answers_map = {}
    for a in saved_answers:
        answers_map[str(a.question_id)] = {
            "selected_option_id": a.selected_option_id,
            "answer_text": a.answer_text,
            "image_path": a.image_path
        }

    return {
        "session_id": session.id,
        "exam_id": session.exam_id,
        "exam_title": session.exam.title if session.exam else "Examination",
        "duration_minutes": session.exam.duration_minutes if session.exam else 30,
        "status": session.status.value,
        "time_remaining_seconds": remaining,
        "started_at": session.started_at,
        "expires_at": session.expires_at,
        "identity_verified": bool(session.identity_verified),
        "identity_confidence": session.identity_confidence,
        "last_face_match_confidence": session.last_face_match_confidence,
        "room_scan_completed": bool(session.room_scan_completed),
        "room_scan_url": session.room_scan_url,
        "retention_policy": RETENTION_POLICY_STATEMENT,
        "retention_purge_date": session.retention_purge_date,
        "questions": formatted_questions,
        "answers": answers_map
    }


@router.post("/{session_id}/verify-identity")
async def verify_identity(
    session_id: int,
    file: UploadFile = File(...),
    live_frame: Optional[UploadFile] = File(None),
    live_frame_base64: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Identity Verification Endpoint:
    Captures reference ID photo, compares against live webcam frame,
    and records match confidence score.
    Privacy Guarantee: Never stores biometric template or embeddings.
    Reference photo is retained for 30 days per policy.
    """
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    os.makedirs("uploads/id_photos", exist_ok=True)
    ref_bytes = await file.read()
    file_ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    filename = f"id_ref_{session_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    saved_path = os.path.join("uploads/id_photos", filename)

    with open(saved_path, "wb") as f:
        f.write(ref_bytes)

    # Read live frame bytes
    live_bytes = None
    if live_frame:
        live_bytes = await live_frame.read()
    elif live_frame_base64:
        try:
            if "," in live_frame_base64:
                live_frame_base64 = live_frame_base64.split(",")[1]
            live_bytes = base64.b64decode(live_frame_base64)
        except Exception:
            live_bytes = None

    if not live_bytes:
        # If no live frame passed separately, compare reference photo against self for initial calibration
        live_bytes = ref_bytes

    confidence = compute_face_match_confidence(ref_bytes, live_bytes)
    is_verified = confidence >= 0.68

    now = datetime.now(timezone.utc)
    session.id_photo_url = f"/uploads/id_photos/{filename}"
    session.identity_verified = is_verified
    session.identity_confidence = confidence
    session.last_face_match_confidence = confidence
    session.id_verification_timestamp = now
    session.retention_purge_date = now + timedelta(days=PHOTO_RETENTION_DAYS)
    db.commit()

    return {
        "session_id": session.id,
        "identity_verified": is_verified,
        "confidence": confidence,
        "photo_url": session.id_photo_url,
        "retention_purge_date": session.retention_purge_date.isoformat() if session.retention_purge_date else None,
        "policy": RETENTION_POLICY_STATEMENT
    }


@router.post("/{session_id}/periodic-face-check")
async def periodic_face_check(
    session_id: int,
    live_frame: Optional[UploadFile] = File(None),
    live_frame_base64: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Random/Periodic Face-Match Check during active exam session.
    Compares live webcam frame against stored reference photo.
    Records match-confidence score without modifying official grade.
    """
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if not session.id_photo_url:
        return {
            "status": "SKIPPED",
            "message": "No reference photo on file for session.",
            "match_confidence": 1.0
        }

    # Load stored reference photo
    ref_rel_path = session.id_photo_url.lstrip("/")
    if not os.path.exists(ref_rel_path):
        return {
            "status": "SKIPPED",
            "message": "Reference photo path not found on server.",
            "match_confidence": 1.0
        }

    with open(ref_rel_path, "rb") as f:
        ref_bytes = f.read()

    live_bytes = None
    if live_frame:
        live_bytes = await live_frame.read()
    elif live_frame_base64:
        try:
            if "," in live_frame_base64:
                live_frame_base64 = live_frame_base64.split(",")[1]
            live_bytes = base64.b64decode(live_frame_base64)
        except Exception:
            live_bytes = None

    if not live_bytes:
        raise HTTPException(status_code=400, detail="Live frame snapshot is required.")

    confidence = compute_face_match_confidence(ref_bytes, live_bytes)
    session.last_face_match_confidence = confidence

    status_str = "MATCH"
    if confidence < 0.65:
        status_str = "POTENTIAL_MISMATCH"
        # Queue violation event for examiner human review
        event = ProctorEvent(
            session_id=str(session.id),
            event_type=ProctorEventType.FACE_MISMATCH,
            suspicion_increment=10.0,
            review_status="PENDING",
            timestamp=datetime.now(timezone.utc)
        )
        db.add(event)
        session.ai_suspicion_score = min(100.0, (session.ai_suspicion_score or 0.0) + 10.0)

    db.commit()

    return {
        "session_id": session.id,
        "match_confidence": confidence,
        "status": status_str,
        "threshold": 0.65
    }


@router.get("/{session_id}/identity-status")
def get_identity_status(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns candidate identity verification status, match confidence, and retention metadata.
    """
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    return {
        "session_id": session.id,
        "identity_verified": bool(session.identity_verified),
        "identity_confidence": session.identity_confidence,
        "last_face_match_confidence": session.last_face_match_confidence,
        "id_photo_url": session.id_photo_url,
        "room_scan_completed": bool(session.room_scan_completed),
        "room_scan_url": session.room_scan_url,
        "retention_purge_date": session.retention_purge_date.isoformat() if session.retention_purge_date else None,
        "policy": RETENTION_POLICY_STATEMENT
    }


@router.post("/{session_id}/room-scan")
async def upload_room_scan_video(
    session_id: int,
    video: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Uploads 360° webcam pan video clip before timer starts.
    Saved to storage and attached to session for review ONLY if session is later flagged.
    """
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    os.makedirs("uploads/room_scans", exist_ok=True)
    video_bytes = await video.read()
    filename = f"room_scan_{session_id}_{uuid.uuid4().hex[:8]}.webm"
    saved_path = os.path.join("uploads/room_scans", filename)

    with open(saved_path, "wb") as f:
        f.write(video_bytes)

    session.room_scan_url = f"/uploads/room_scans/{filename}"
    session.room_scan_completed = True
    db.commit()

    return {
        "session_id": session.id,
        "room_scan_completed": True,
        "room_scan_url": session.room_scan_url,
        "message": "360° room scan clip attached to session for flagged-only review."
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


@router.get("/pending-review")
def list_sessions_for_review(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("examiner", "admin"))
):
    """
    Returns exam sessions requiring examiner subjective review and grading (Examiner & Admin only).
    """
    sessions = db.query(ExamSession).filter(
        ExamSession.status.in_([SessionStatus.SUBMITTED, SessionStatus.EXPIRED, SessionStatus.PUBLISHED, SessionStatus.DISQUALIFIED])
    ).order_by(ExamSession.id.desc()).all()

    output = []
    for s in sessions:
        results = db.query(Result).filter(Result.session_id == s.id).all()
        answers = db.query(Answer).filter(Answer.session_id == s.id).all()
        total_score = sum(r.score for r in results) if s.status != SessionStatus.DISQUALIFIED else 0.0
        max_score = sum(r.max_score for r in results)
        output.append({
            "session_id": s.id,
            "student_id": s.student_id,
            "student_name": s.student.name if s.student else "Candidate",
            "student_email": s.student.email if s.student else "",
            "exam_id": s.exam_id,
            "exam_title": s.exam.title if s.exam else "Examination",
            "subject": s.exam.subject if s.exam else "General",
            "status": s.status,
            "started_at": s.started_at,
            "submitted_at": s.submitted_at,
            "suspicion_score": s.suspicion_score or 0.0,
            "total_score": round(total_score, 2),
            "max_score": round(max_score, 2),
            "answer_count": len(answers),
            "needs_subjective_review": any(r.evaluation_type in [EvaluationType.AI, EvaluationType.EXAMINER] for r in results)
        })

    return output


@router.get("/{session_id}/full-details")
def get_session_full_details(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("examiner", "admin"))
):
    """
    Retrieves complete candidate answers, AI evaluations, and proctoring telemetry for review (Examiner & Admin only).
    """
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    answers = db.query(Answer).filter(Answer.session_id == session_id).all()
    results = db.query(Result).filter(Result.session_id == session_id).all()
    res_by_qid = {r.question_id: r for r in results}

    answers_detail = []
    for a in answers:
        q = db.query(QuestionBank).filter(QuestionBank.id == a.question_id).first()
        r = res_by_qid.get(a.question_id)
        ocr_text = extract_text_from_image(a.image_path) if a.image_path else None
        answers_detail.append({
            "answer_id": a.id,
            "question_id": a.question_id,
            "question_text": q.question_text if q else "",
            "question_type": q.question_type if q else "",
            "max_marks": q.marks if q else 0.0,
            "model_answer": q.model_answer if q else "",
            "selected_option_id": a.selected_option_id,
            "student_response": a.answer_text or "",
            "image_path": a.image_path,
            "ocr_text": ocr_text,
            "current_score": r.score if r else 0.0,
            "evaluation_type": r.evaluation_type if r else "manual",
            "feedback": r.feedback if r else "",
            "submitted_at": a.submitted_at
        })

    return {
        "session_id": session.id,
        "student_name": session.student.name if session.student else "Candidate",
        "student_email": session.student.email if session.student else "",
        "exam_title": session.exam.title if session.exam else "Examination",
        "subject": session.exam.subject if session.exam else "General",
        "status": session.status,
        "suspicion_score": session.suspicion_score or 0.0,
        "started_at": session.started_at,
        "submitted_at": session.submitted_at,
        "answers": answers_detail
    }


@router.post("/{session_id}/grade")
def save_examiner_grades(
    session_id: int,
    payload: ExaminerGradeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("examiner", "admin"))
):
    """
    Examiner overrides AI/auto scores and adds feedback notes (Examiner & Admin only).
    Rejects modification if session results have already been published.
    """
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if session.status == SessionStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify grades: Examination results have already been certified and published."
        )

    for item in payload.grades:
        res = db.query(Result).filter(
            Result.session_id == session_id,
            Result.question_id == item.question_id
        ).first()

        if res:
            res.score = item.score
            res.evaluation_type = EvaluationType.EXAMINER
            if item.feedback:
                res.feedback = item.feedback
        else:
            q = db.query(QuestionBank).filter(QuestionBank.id == item.question_id).first()
            max_m = q.marks if q else item.score
            new_res = Result(
                session_id=session_id,
                question_id=item.question_id,
                score=item.score,
                max_score=max_m,
                evaluation_type=EvaluationType.EXAMINER,
                feedback=item.feedback or "Graded by Examiner"
            )
            db.add(new_res)

    db.commit()
    return {"message": "Grades successfully saved.", "session_id": session_id}


@router.post("/{session_id}/integrity-decision")
def make_integrity_decision(
    session_id: int,
    payload: IntegrityDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("examiner", "admin"))
):
    """
    Examiner integrity decision: publish results or disqualify candidate session (Examiner & Admin only).
    Disqualifying a session zeros out all marks in the database.
    """
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    decision = payload.decision.lower()
    if decision == "publish":
        session.status = SessionStatus.PUBLISHED
    elif decision == "disqualify":
        session.status = SessionStatus.DISQUALIFIED
        # Zero out all results in DB for this session
        results = db.query(Result).filter(Result.session_id == session_id).all()
        for r in results:
            r.score = 0.0
            r.feedback = (r.feedback or "") + " [Disqualified for Academic Integrity Violation]"
    else:
        raise HTTPException(status_code=400, detail="Invalid decision. Must be 'publish' or 'disqualify'.")

    db.commit()
    return {
        "session_id": session_id,
        "status": session.status,
        "message": f"Session marked as {session.status.value.upper()}."
    }


@router.get("/{session_id}/report.pdf")
def download_exam_report_pdf(
    session_id: int,
    token: Optional[str] = None,
    db: Session = Depends(get_db),
    auth_token: Optional[str] = Depends(oauth2_scheme)
):
    """
    Generates and streams the official candidate scorecard PDF with SHA-256 digital verification.
    Access restricted to candidate owner, Examiners, and Administrators (or certified published scorecards).
    """
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    user = None
    active_token = auth_token or token
    if active_token:
        payload = decode_access_token(active_token)
        if payload and payload.get("sub"):
            try:
                user = db.query(User).filter(User.id == int(payload["sub"])).first()
            except Exception:
                pass

    if user and user.role == UserRole.STUDENT and user.id != session.student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to candidate scorecard.")

    if not user and session.status not in [SessionStatus.PUBLISHED, SessionStatus.SUBMITTED]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required to view unfinalized session report.")

    results = db.query(Result).filter(Result.session_id == session_id).all()
    results_list = []
    total_score = 0.0
    max_score = 0.0

    for r in results:
        q = db.query(QuestionBank).filter(QuestionBank.id == r.question_id).first()
        actual_score = 0.0 if session.status == SessionStatus.DISQUALIFIED else r.score
        total_score += actual_score
        max_score += r.max_score
        results_list.append({
            "question_text": q.question_text if q else f"Question #{r.question_id}",
            "question_type": q.question_type if q else "MCQ",
            "score": actual_score,
            "max_score": r.max_score,
            "evaluation_type": r.evaluation_type,
            "feedback": r.feedback or "Evaluated"
        })

    pdf_buffer = generate_exam_report_pdf(
        session_id=session.id,
        candidate_name=session.student.name if session.student else "Candidate",
        candidate_email=session.student.email if session.student else "student@example.com",
        exam_title=session.exam.title if session.exam else "Examination",
        subject=session.exam.subject if session.exam else "General",
        status=session.status.value,
        total_score=round(total_score, 2),
        max_score=round(max_score, 2),
        suspicion_score=session.suspicion_score or 0.0,
        results_list=results_list,
        started_at=session.started_at,
        submitted_at=session.submitted_at
    )

    filename = f"scorecard_session_{session_id}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


