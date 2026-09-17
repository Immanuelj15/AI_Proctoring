import io
import pytest
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from app.services.pdf_extractor import extract_text_from_pdf, parse_questions_heuristic, parse_questions_from_pdf

def generate_mock_exam_pdf_bytes() -> bytes:
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    p.drawString(50, 750, "MIDTERM EXAMINATION: COMPUTER NETWORKS & SYSTEMS")
    
    p.drawString(50, 710, "1. Which transport layer protocol provides connection-oriented reliable byte stream delivery? [2 Marks]")
    p.drawString(70, 690, "(A) UDP  (B) TCP  (C) ICMP  (D) ARP")
    p.drawString(70, 670, "Answer: B")
    
    p.drawString(50, 630, "2. In relational databases, what does the ACID acronym stand for? [5 Marks]")
    p.drawString(70, 610, "Ans: Atomicity, Consistency, Isolation, Durability")
    
    p.drawString(50, 570, "3. Explain in detail the mechanism of Two-Phase Locking (2PL) and describe how it prevents serializability anomalies. [10 Marks]")
    
    p.showPage()
    p.save()
    return buffer.getvalue()


def test_pdf_text_extraction_and_heuristic_parser():
    pdf_bytes = generate_mock_exam_pdf_bytes()
    assert len(pdf_bytes) > 0

    # 1. Test text extraction
    extracted_text = extract_text_from_pdf(pdf_bytes)
    assert "MIDTERM EXAMINATION" in extracted_text
    assert "transport layer protocol" in extracted_text

    # 2. Test heuristic parsing
    questions = parse_questions_heuristic(extracted_text, default_subject="Computer Science")
    assert len(questions) >= 3

    # Check MCQ Question
    mcq = next(q for q in questions if q["question_type"] == "MCQ")
    assert "transport layer protocol" in mcq["question_text"]
    assert len(mcq["options"]) == 4
    # Option B should be correct
    b_opt = next((o for o in mcq["options"] if "TCP" in o["option_text"]), None)
    assert b_opt is not None
    assert b_opt["is_correct"] is True

    # Check Long/Short Answer
    long_q = next((q for q in questions if q["question_type"] == "LONG_ANSWER"), None)
    assert long_q is not None
    assert "Two-Phase Locking" in long_q["question_text"]
    assert long_q["marks"] == 10.0


def test_api_extract_pdf_and_batch_create(client):
    # Setup examiner user
    ex_reg = client.post("/auth/register", json={
        "name": "Prof. Turing",
        "email": "turing_pdf@example.com",
        "password": "Password123!",
        "role": "examiner"
    })
    assert ex_reg.status_code == 201

    login_res = client.post("/auth/login", json={
        "email": "turing_pdf@example.com",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    pdf_bytes = generate_mock_exam_pdf_bytes()

    # 1. Test /questions/extract-pdf
    upload_res = client.post(
        "/questions/extract-pdf",
        files={"file": ("sample_exam.pdf", pdf_bytes, "application/pdf")},
        data={"subject": "Computer Science"},
        headers=headers
    )
    assert upload_res.status_code == 200
    extract_data = upload_res.json()
    assert extract_data["extracted_count"] >= 3
    parsed_questions = extract_data["questions"]

    # 2. Test /questions/batch creation
    batch_res = client.post(
        "/questions/batch",
        json=parsed_questions,
        headers=headers
    )
    assert batch_res.status_code == 201
    created_list = batch_res.json()
    assert len(created_list) == len(parsed_questions)
    assert any(q["question_type"] == "MCQ" for q in created_list)
