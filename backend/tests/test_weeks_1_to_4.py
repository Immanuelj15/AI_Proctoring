import pytest

def test_weeks_1_to_4_end_to_end_flow(client):
    # 1. Register Examiner
    ex_res = client.post("/auth/register", json={
        "name": "Dr. Alan Turing",
        "email": "turing_examiner@example.com",
        "password": "ExaminerPass123!",
        "role": "examiner"
    })
    assert ex_res.status_code == 201

    ex_login = client.post("/auth/login", json={
        "email": "turing_examiner@example.com",
        "password": "ExaminerPass123!"
    })
    ex_token = ex_login.json()["access_token"]
    ex_headers = {"Authorization": f"Bearer {ex_token}"}

    # 2. Create MCQ Question (with correct Paris option)
    mcq_res = client.post("/questions", json={
        "question_text": "What is the capital of France?",
        "question_type": "MCQ",
        "subject": "Geography",
        "difficulty": "EASY",
        "marks": 2.0,
        "negative_marks": 0.5,
        "options": [
            {"option_text": "Paris", "is_correct": True},
            {"option_text": "London", "is_correct": False}
        ]
    }, headers=ex_headers)
    assert mcq_res.status_code == 201
    mcq_data = mcq_res.json()
    mcq_id = mcq_data["id"]
    correct_opt_id = mcq_data["options"][0]["id"]

    # 3. Create Short Answer Question
    short_q_res = client.post("/questions", json={
        "question_text": "Explain the concept of recursion in computer science.",
        "question_type": "SHORT_ANSWER",
        "subject": "Computer Science",
        "difficulty": "MEDIUM",
        "marks": 5.0,
        "model_answer": "Recursion is a function calling itself until a base condition is met."
    }, headers=ex_headers)
    assert short_q_res.status_code == 201
    short_q_id = short_q_res.json()["id"]

    # 4. Create Exam Configuration
    exam_res = client.post("/exams", json={
        "title": "Comprehensive General Knowledge & CS Exam",
        "subject": "Computer Science",
        "duration_minutes": 45,
        "randomization_enabled": True,
        "proctoring_enabled": True
    }, headers=ex_headers)
    assert exam_res.status_code == 201
    exam_id = exam_res.json()["id"]

    # Attach both questions to exam
    client.post(f"/exams/{exam_id}/questions", json={"question_id": mcq_id, "question_order": 1}, headers=ex_headers)
    client.post(f"/exams/{exam_id}/questions", json={"question_id": short_q_id, "question_order": 2}, headers=ex_headers)

    # 5. Register Student & Start Timed Exam Session
    st_res = client.post("/auth/register", json={
        "name": "Alice Student",
        "email": "alice_student@example.com",
        "password": "StudentPass123!",
        "role": "student"
    })
    assert st_res.status_code == 201

    st_login = client.post("/auth/login", json={
        "email": "alice_student@example.com",
        "password": "StudentPass123!"
    })
    st_token = st_login.json()["access_token"]
    st_headers = {"Authorization": f"Bearer {st_token}"}

    session_res = client.post("/exam-sessions/start", json={"exam_id": exam_id}, headers=st_headers)
    assert session_res.status_code == 201
    sess_data = session_res.json()
    sess_id = sess_data["session_id"]
    assert sess_data["time_remaining_seconds"] > 0
    assert len(sess_data["questions"]) == 2

    # Verify Server-side Remaining Time endpoint
    time_res = client.get(f"/exam-sessions/{sess_id}/time-remaining", headers=st_headers)
    assert time_res.status_code == 200
    assert time_res.json()["time_remaining_seconds"] <= 45 * 60

    # 6. Student Submits Answers
    # Answer MCQ correctly
    mcq_ans_res = client.post(f"/exam-sessions/{sess_id}/answers", json={
        "question_id": mcq_id,
        "selected_option_id": correct_opt_id
    }, headers=st_headers)
    assert mcq_ans_res.status_code == 200

    # Answer Short Answer question
    short_ans_res = client.post(f"/exam-sessions/{sess_id}/answers", json={
        "question_id": short_q_id,
        "answer_text": "Recursion is when a function calls itself until reaching a base condition."
    }, headers=st_headers)
    assert short_ans_res.status_code == 200

    # 7. Final Exam Submission & Auto-Evaluation Pipeline
    submit_res = client.post(f"/exam-sessions/{sess_id}/submit", headers=st_headers)
    assert submit_res.status_code == 200
    sub_data = submit_res.json()

    assert sub_data["status"] == "submitted"
    assert sub_data["auto_graded_count"] == 1
    assert sub_data["llm_evaluated_count"] == 1
    assert sub_data["total_score"] > 0.0
    assert len(sub_data["results"]) == 2
