import io
import json
import pytest
from PIL import Image
from app.services.identity_verification import compute_face_match_confidence, RETENTION_POLICY_STATEMENT, PHOTO_RETENTION_DAYS
from app.models.proctor_event import ProctorEvent, ProctorEventType
from app.models.session import ExamSession, SessionStatus
from app.models.question import QuestionBank, QuestionType
from app.models.exam import Exam, ExamQuestion


def create_test_image_bytes(color="red", size=(100, 100)) -> bytes:
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_identity_service_confidence():
    img1 = create_test_image_bytes(color="blue")
    img2 = create_test_image_bytes(color="blue")
    score_same = compute_face_match_confidence(img1, img2)
    assert 0.0 <= score_same <= 1.0
    assert score_same >= 0.70

    img3 = create_test_image_bytes(color="black")
    score_diff = compute_face_match_confidence(img1, img3)
    assert 0.0 <= score_diff <= 1.0
    assert "30" in str(PHOTO_RETENTION_DAYS)
    assert "NEVER" in RETENTION_POLICY_STATEMENT


@pytest.mark.asyncio
async def test_identity_and_room_scan_flow(client):
    # Register student & examiner
    client.post("/auth/register", json={
        "name": "Integrity Student",
        "email": "student_integrity@test.com",
        "password": "Password123!",
        "role": "student"
    })
    st_login = client.post("/auth/login", json={
        "email": "student_integrity@test.com",
        "password": "Password123!"
    })
    st_token = st_login.json()["access_token"]
    st_headers = {"Authorization": f"Bearer {st_token}"}

    client.post("/auth/register", json={
        "name": "Integrity Examiner",
        "email": "examiner_integrity@test.com",
        "password": "Password123!",
        "role": "examiner"
    })
    ex_login = client.post("/auth/login", json={
        "email": "examiner_integrity@test.com",
        "password": "Password123!"
    })
    ex_token = ex_login.json()["access_token"]
    ex_headers = {"Authorization": f"Bearer {ex_token}"}

    # Create question and exam
    q_res = client.post("/questions", json={
        "question_text": "What is 2 + 2?",
        "question_type": "MCQ",
        "subject": "Math",
        "difficulty": "EASY",
        "marks": 2.0,
        "negative_marks": 0.0,
        "options": [
            {"option_text": "4", "is_correct": True},
            {"option_text": "5", "is_correct": False}
        ]
    }, headers=ex_headers)
    q_id = q_res.json()["id"]

    exam_res = client.post("/exams", json={
        "title": "Math Integrity Assessment",
        "subject": "Math",
        "duration_minutes": 30,
        "proctoring_enabled": True,
        "randomization_enabled": True,
        "questions": [{"question_id": q_id, "orderIndex": 1}]
    }, headers=ex_headers)
    exam_id = exam_res.json()["id"]

    # Start student session
    start_res = client.post("/exam-sessions/start", json={"exam_id": exam_id}, headers=st_headers)
    assert start_res.status_code == 201
    session_id = start_res.json()["session_id"]

    # 1. Identity Verification Upload
    img_bytes = create_test_image_bytes(color="green")
    verify_res = client.post(
        f"/exam-sessions/{session_id}/verify-identity",
        files={"file": ("id_card.jpg", img_bytes, "image/jpeg")},
        headers=st_headers
    )
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["identity_verified"] is True
    assert verify_data["confidence"] > 0.60
    assert "retention_purge_date" in verify_data

    # 2. Periodic Face Check
    periodic_res = client.post(
        f"/exam-sessions/{session_id}/periodic-face-check",
        files={"live_frame": ("snapshot.jpg", img_bytes, "image/jpeg")},
        headers=st_headers
    )
    assert periodic_res.status_code == 200
    assert periodic_res.json()["status"] == "MATCH"

    # 3. Room Scan Upload
    video_bytes = b"MOCK_WEBM_VIDEO_DATA_360_ROOM_SCAN"
    room_scan_res = client.post(
        f"/exam-sessions/{session_id}/room-scan",
        files={"video": ("scan.webm", video_bytes, "video/webm")},
        headers=st_headers
    )
    assert room_scan_res.status_code == 200
    assert room_scan_res.json()["room_scan_completed"] is True
    assert "room_scan" in room_scan_res.json()["room_scan_url"]

    # 4. Identity Status Check
    status_res = client.get(f"/exam-sessions/{session_id}/identity-status", headers=st_headers)
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["identity_verified"] is True
    assert status_data["room_scan_completed"] is True


@pytest.mark.asyncio
async def test_hybrid_review_queue(client, db_session):
    # Setup examiner & student
    client.post("/auth/register", json={
        "name": "Queue Student",
        "email": "queue_student@test.com",
        "password": "Password123!",
        "role": "student"
    })
    st_login = client.post("/auth/login", json={
        "email": "queue_student@test.com",
        "password": "Password123!"
    })
    st_token = st_login.json()["access_token"]
    st_headers = {"Authorization": f"Bearer {st_token}"}

    client.post("/auth/register", json={
        "name": "Queue Examiner",
        "email": "queue_examiner@test.com",
        "password": "Password123!",
        "role": "examiner"
    })
    ex_login = client.post("/auth/login", json={
        "email": "queue_examiner@test.com",
        "password": "Password123!"
    })
    ex_token = ex_login.json()["access_token"]
    ex_headers = {"Authorization": f"Bearer {ex_token}"}

    # Create exam & session
    exam_res = client.post("/exams", json={
        "title": "Review Queue Exam",
        "subject": "CS",
        "duration_minutes": 20,
        "questions": []
    }, headers=ex_headers)
    exam_id = exam_res.json()["id"]

    start_res = client.post("/exam-sessions/start", json={"exam_id": exam_id}, headers=st_headers)
    session_id = start_res.json()["session_id"]

    # Inject a proctor event with review_status="PENDING"
    event = ProctorEvent(
        session_id=str(session_id),
        event_type=ProctorEventType.OFF_SCREEN_GAZE,
        suspicion_increment=15.0,
        review_status="PENDING"
    )
    db_session.add(event)
    sess_obj = db_session.query(ExamSession).filter(ExamSession.id == session_id).first()
    sess_obj.ai_suspicion_score = 15.0
    sess_obj.confirmed_suspicion_score = 0.0
    db_session.commit()

    # Examiner inspects review queue
    queue_res = client.get("/api/v1/proctor/review-queue?status_filter=PENDING", headers=ex_headers)
    assert queue_res.status_code == 200
    queue_items = queue_res.json()
    assert len(queue_items) >= 1
    target_event = next(item for item in queue_items if item["session_id"] == str(session_id))
    assert target_event["review_status"] == "PENDING"
    assert target_event["session_confirmed_suspicion"] == 0.0  # AI flag has NOT penalized student yet!

    # Examiner confirms the violation
    review_res = client.post(
        f"/api/v1/proctor/events/{target_event['id']}/review",
        json={"decision": "CONFIRM", "notes": "Gaze shifted off screen for 10 seconds."},
        headers=ex_headers
    )
    assert review_res.status_code == 200
    assert review_res.json()["review_status"] == "CONFIRMED"
    assert review_res.json()["confirmed_suspicion_score"] == 15.0  # Confirmed score now incremented


@pytest.mark.asyncio
async def test_crash_safe_resume(client):
    # Setup candidate
    client.post("/auth/register", json={
        "name": "Crash Candidate",
        "email": "crash_cand@test.com",
        "password": "Password123!",
        "role": "student"
    })
    st_login = client.post("/auth/login", json={
        "email": "crash_cand@test.com",
        "password": "Password123!"
    })
    st_token = st_login.json()["access_token"]
    st_headers = {"Authorization": f"Bearer {st_token}"}

    client.post("/auth/register", json={
        "name": "Crash Examiner",
        "email": "crash_ex@test.com",
        "password": "Password123!",
        "role": "examiner"
    })
    ex_login = client.post("/auth/login", json={
        "email": "crash_ex@test.com",
        "password": "Password123!"
    })
    ex_headers = {"Authorization": f"Bearer {ex_login.json()['access_token']}"}

    # Create questions & exam
    q1 = client.post("/questions", json={
        "question_text": "Question Alpha",
        "question_type": "MCQ",
        "subject": "CS",
        "marks": 2.0,
        "options": [{"option_text": "A", "is_correct": True}, {"option_text": "B", "is_correct": False}]
    }, headers=ex_headers).json()["id"]

    q2 = client.post("/questions", json={
        "question_text": "Question Beta",
        "question_type": "SHORT_ANSWER",
        "subject": "CS",
        "marks": 5.0
    }, headers=ex_headers).json()["id"]

    exam_id = client.post("/exams", json={
        "title": "Crash Resume Exam",
        "subject": "CS",
        "duration_minutes": 25,
        "questions": [{"question_id": q1, "orderIndex": 1}, {"question_id": q2, "orderIndex": 2}]
    }, headers=ex_headers).json()["id"]

    # Start session
    start_res = client.post("/exam-sessions/start", json={"exam_id": exam_id}, headers=st_headers)
    session_id = start_res.json()["session_id"]
    orig_q_order = [q["id"] for q in start_res.json()["questions"]]

    # Submit an answer to question 1
    ans_res = client.post(f"/exam-sessions/{session_id}/answers", json={
        "question_id": q1,
        "answer_text": "Student selected A"
    }, headers=st_headers)
    assert ans_res.status_code == 200

    # Simulating crash or browser reload -> invoke /resume
    resume_res = client.get(f"/exam-sessions/{session_id}/resume", headers=st_headers)
    assert resume_res.status_code == 200
    resume_data = resume_res.json()

    # 1. Deterministic question order restored
    resumed_q_order = [int(q["id"]) for q in resume_data["questions"]]
    assert resumed_q_order == orig_q_order

    # 2. Saved answer restored
    assert str(q1) in resume_data["answers"]
    assert resume_data["answers"][str(q1)]["answer_text"] == "Student selected A"

    # 3. Server-authoritative timer continues
    assert resume_data["time_remaining_seconds"] > 0
    assert resume_data["status"] == "active"
