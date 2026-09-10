import pytest

def test_complete_flowchart_lifecycle(client):
    # 1. Setup Examiner
    ex_reg = client.post("/auth/register", json={
        "name": "Prof. Ada Lovelace",
        "email": "ada_examiner@example.com",
        "password": "ExaminerSecret123!",
        "role": "examiner"
    })
    assert ex_reg.status_code == 201

    ex_login = client.post("/auth/login", json={
        "email": "ada_examiner@example.com",
        "password": "ExaminerSecret123!"
    })
    ex_token = ex_login.json()["access_token"]
    ex_headers = {"Authorization": f"Bearer {ex_token}"}

    # 2. Setup Student
    st_reg = client.post("/auth/register", json={
        "name": "Grace Hopper",
        "email": "grace_student@example.com",
        "password": "StudentSecret123!",
        "role": "student"
    })
    assert st_reg.status_code == 201

    st_login = client.post("/auth/login", json={
        "email": "grace_student@example.com",
        "password": "StudentSecret123!"
    })
    st_token = st_login.json()["access_token"]
    st_headers = {"Authorization": f"Bearer {st_token}"}

    # 3. Create Questions (MCQ + Short Answer)
    mcq = client.post("/questions", json={
        "question_text": "Which layer of OSI model handles routing?",
        "question_type": "MCQ",
        "subject": "Networking",
        "difficulty": "MEDIUM",
        "marks": 3.0,
        "negative_marks": 1.0,
        "options": [
            {"option_text": "Network Layer", "is_correct": True},
            {"option_text": "Physical Layer", "is_correct": False}
        ]
    }, headers=ex_headers)
    assert mcq.status_code == 201
    mcq_id = mcq.json()["id"]
    correct_opt_id = mcq.json()["options"][0]["id"]

    sub_q = client.post("/questions", json={
        "question_text": "What is the primary function of an operating system kernel?",
        "question_type": "SHORT_ANSWER",
        "subject": "OS",
        "difficulty": "EASY",
        "marks": 5.0,
        "model_answer": "The kernel manages hardware resources, processes, and memory."
    }, headers=ex_headers)
    assert sub_q.status_code == 201
    sub_q_id = sub_q.json()["id"]

    # 4. Create Exam & Link Questions
    exam = client.post("/exams", json={
        "title": "Systems Architecture Final",
        "subject": "Computer Science",
        "duration_minutes": 30,
        "randomization_enabled": True,
        "proctoring_enabled": True
    }, headers=ex_headers)
    assert exam.status_code == 201
    exam_id = exam.json()["id"]

    client.post(f"/exams/{exam_id}/questions", json={"question_id": mcq_id, "question_order": 1}, headers=ex_headers)
    client.post(f"/exams/{exam_id}/questions", json={"question_id": sub_q_id, "question_order": 2}, headers=ex_headers)


    # 5. Student Starts Exam Session
    session_res = client.post("/exam-sessions/start", json={"exam_id": exam_id}, headers=st_headers)
    assert session_res.status_code == 201
    session_data = session_res.json()
    sess_id = session_data["session_id"]
    assert session_data["time_remaining_seconds"] > 0
    assert len(session_data["questions"]) == 2

    # 6. Student Submits Answers
    client.post(f"/exam-sessions/{sess_id}/answers", json={
        "question_id": mcq_id,
        "selected_option_id": correct_opt_id
    }, headers=st_headers)

    client.post(f"/exam-sessions/{sess_id}/answers", json={
        "question_id": sub_q_id,
        "answer_text": "The kernel is the core component managing hardware, cpu scheduling, and memory allocation."
    }, headers=st_headers)

    # 7. Student Submits Exam
    submit_res = client.post(f"/exam-sessions/{sess_id}/submit", headers=st_headers)
    assert submit_res.status_code == 200
    sub_data = submit_res.json()
    assert sub_data["auto_graded_count"] == 1
    assert sub_data["llm_evaluated_count"] == 1
    assert sub_data["total_score"] > 0

    # 8. Examiner Reviews Pending Queue
    pending_res = client.get("/exam-sessions/pending-review", headers=ex_headers)
    assert pending_res.status_code == 200
    pending_list = pending_res.json()
    assert any(p["session_id"] == sess_id for p in pending_list)

    # 9. Examiner Inspects Full Details
    details_res = client.get(f"/exam-sessions/{sess_id}/full-details", headers=ex_headers)
    assert details_res.status_code == 200
    assert len(details_res.json()["answers"]) == 2

    # 10. Examiner Overrides / Finalizes Score
    grade_res = client.post(f"/exam-sessions/{sess_id}/grade", json={
        "grades": [
            {"question_id": sub_q_id, "score": 5.0, "feedback": "Flawless explanation of kernel core services."}
        ]
    }, headers=ex_headers)
    assert grade_res.status_code == 200

    # 11. Examiner Integrity Decision (Publish)
    decision_res = client.post(f"/exam-sessions/{sess_id}/integrity-decision", json={
        "decision": "publish"
    }, headers=ex_headers)
    assert decision_res.status_code == 200
    assert decision_res.json()["status"] == "published"

    # 12. Candidate / Examiner Downloads PDF Scorecard
    pdf_res = client.get(f"/exam-sessions/{sess_id}/report.pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF")

    # 13. Check Monitored Sessions List
    proctor_list_res = client.get("/api/v1/proctor/sessions")
    assert proctor_list_res.status_code == 200
    assert any(s["sessionId"] == str(sess_id) for s in proctor_list_res.json())
