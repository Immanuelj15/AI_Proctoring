import pytest

def test_question_bank_and_exam_flow(client):
    # 1. Register Examiner
    examiner_res = client.post("/auth/register", json={
        "name": "Prof Smith",
        "email": "examiner_questions@example.com",
        "password": "ExaminerPass123!",
        "role": "examiner"
    })
    assert examiner_res.status_code == 201

    # 2. Login Examiner
    login_res = client.post("/auth/login", json={
        "email": "examiner_questions@example.com",
        "password": "ExaminerPass123!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create Question in Question Bank
    q_res = client.post("/questions", json={
        "question_text": "What is the capital of France?",
        "question_type": "MCQ",
        "subject": "Geography",
        "difficulty": "EASY",
        "marks": 2.0,
        "negative_marks": 0.5,
        "options": [
          {"option_text": "Paris", "is_correct": True},
          {"option_text": "London", "is_correct": False},
          {"option_text": "Berlin", "is_correct": False}
        ]
    }, headers=headers)
    assert q_res.status_code == 201
    question_data = q_res.json()
    assert question_data["question_text"] == "What is the capital of France?"
    assert len(question_data["options"]) == 3
    q_id = question_data["id"]

    # 4. List Questions
    list_q_res = client.get("/questions?subject=Geography", headers=headers)
    assert list_q_res.status_code == 200
    assert len(list_q_res.json()) >= 1

    # 5. Create Exam Configuration
    exam_res = client.post("/exams", json={
        "title": "Midterm Geography Exam",
        "subject": "Geography",
        "duration_minutes": 60,
        "proctoring_enabled": True,
        "gaze_sensitivity": "high"
    }, headers=headers)
    assert exam_res.status_code == 201
    exam_data = exam_res.json()
    assert exam_data["title"] == "Midterm Geography Exam"
    exam_id = exam_data["id"]

    # 6. Attach Question to Exam
    attach_res = client.post(f"/exams/{exam_id}/questions", json={
        "question_id": q_id,
        "question_order": 1
    }, headers=headers)
    assert attach_res.status_code == 200
    assert attach_res.json()["question_count"] == 1

    # 7. Student Authorization Check (Student cannot create questions/exams)
    student_reg = client.post("/auth/register", json={
        "name": "Jane Student",
        "email": "student_rbac@example.com",
        "password": "StudentPass123!",
        "role": "student"
    })
    student_login = client.post("/auth/login", json={
        "email": "student_rbac@example.com",
        "password": "StudentPass123!"
    })
    student_token = student_login.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    forbidden_q = client.post("/questions", json={
        "question_text": "Unauthorized Question?",
        "question_type": "MCQ"
    }, headers=student_headers)
    assert forbidden_q.status_code == 403

    forbidden_exam = client.post("/exams", json={
        "title": "Unauthorized Exam",
        "duration_minutes": 30
    }, headers=student_headers)
    assert forbidden_exam.status_code == 403
