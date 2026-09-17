import io
import json
import os
import re
from typing import List, Optional
import pypdf

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extracts and sanitizes text from raw PDF bytes using pypdf.
    """
    if not file_bytes:
        return ""

    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    extracted_pages = []

    for idx, page in enumerate(reader.pages):
        page_text = page.extract_text() or ""
        if page_text.strip():
            extracted_pages.append(page_text.strip())

    return "\n\n".join(extracted_pages)


def parse_questions_with_llm(raw_text: str, default_subject: str = "General") -> Optional[List[dict]]:
    """
    Attempts to extract structured questions from text using OpenAI GPT-4o.
    Returns None if OpenAI is not configured or an error occurs.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or not api_key.startswith("sk-"):
        return None

    try:
        import openai
        client = openai.OpenAI(api_key=api_key)

        prompt = f"""
        You are an expert academic evaluator and assessment parser.
        Analyze the following question paper text and extract all questions into a clean structured JSON format.

        For each question:
        - "question_text": The clean question prompt or problem statement.
        - "question_type": One of "MCQ", "SHORT_ANSWER", "LONG_ANSWER", or "IMAGE_UPLOAD".
        - "subject": "{default_subject}" unless a specific subject or topic is stated in the question.
        - "difficulty": "EASY", "MEDIUM", or "HARD".
        - "marks": Float numerical mark allocation (default to 1.0 or 2.0 for MCQs, 5.0 for short answer, 10.0 for long answer if not stated).
        - "negative_marks": Float penalty for wrong answers (default 0.0 or 0.25 if MCQ).
        - "model_answer": String containing the correct answer, explanation, or grading rubric key.
        - "options": For MCQs, a list of objects with "option_text" (string) and "is_correct" (boolean, true for the correct option). For non-MCQ questions, empty list [].

        Return ONLY a JSON object with the root key "questions": [...]

        QUESTION PAPER CONTENT:
        {raw_text[:12000]}
        """

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.1
        )

        content = response.choices[0].message.content
        data = json.loads(content)
        questions = data.get("questions", [])
        if isinstance(questions, list) and len(questions) > 0:
            return questions
    except Exception as e:
        print(f"[pdf_extractor] LLM extraction error: {e}")

    return None


def parse_questions_heuristic(raw_text: str, default_subject: str = "General") -> List[dict]:
    """
    Deterministic rule-based fallback parser for standard question paper formats.
    Detects numbered questions (e.g. '1.', 'Q1.', 'Question 1:'), options ('(A)', 'B.', etc.),
    and answer lines ('Answer: B').
    """
    questions = []
    if not raw_text or not raw_text.strip():
        return questions

    # Normalize line endings
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")

    # Pattern to match question stems like:
    # 1. / 1) / Q1. / Q1: / Question 1: / Question 1.
    q_split_pattern = r"(?=(?:^|\n)\s*(?:Q(?:uestion)?\s*\d+[\.\:\)]|\d+[\.\)])\s+)"
    raw_blocks = re.split(q_split_pattern, text, flags=re.IGNORECASE)

    for block in raw_blocks:
        block = block.strip()
        if not block:
            continue

        # Check if block starts with a question number indicator
        start_match = re.match(r"^(?:Q(?:uestion)?\s*\d+[\.\:\)]|\d+[\.\)])\s*", block, flags=re.IGNORECASE)
        if not start_match:
            continue

        content_after_num = block[start_match.end():].strip()
        if not content_after_num:
            continue

        # Check for explicitly declared marks: e.g., [2 Marks], (5 marks), [10 pts]
        marks = 2.0
        neg_marks = 0.0
        mark_match = re.search(r"[\[\(](\d+(?:\.\d+)?)\s*(?:marks?|pts?|points?)[\]\)]", content_after_num, re.IGNORECASE)
        if mark_match:
            try:
                marks = float(mark_match.group(1))
            except ValueError:
                pass
            content_after_num = content_after_num[:mark_match.start()] + content_after_num[mark_match.end():]

        # Check for answer indicator at the end: e.g., "Answer: B", "Ans: C", "Correct: (A)"
        detected_correct_letter = None
        ans_match = re.search(r"(?:Answer|Ans|Correct(?:\s*Option)?)\s*[:\-]?\s*[\(\[]?([A-Da-d1-4])[\)\]]?", content_after_num, re.IGNORECASE)
        if ans_match:
            detected_correct_letter = ans_match.group(1).upper()
            content_after_num = content_after_num[:ans_match.start()].strip()

        # Check for options: e.g., (A) ... (B) ... (C) ... (D) or A. ... B. ...
        opt_pattern = r"(?:^|\n|\s{2,})\s*(?:\(?([A-Da-d])\)|([A-Da-d])[\.\)])\s+"
        opt_splits = list(re.finditer(opt_pattern, content_after_num))

        options = []
        q_text = content_after_num
        q_type = "SHORT_ANSWER"

        if len(opt_splits) >= 2:
            # We found multiple choice options
            q_type = "MCQ"
            q_text = content_after_num[:opt_splits[0].start()].strip()

            for i, match in enumerate(opt_splits):
                letter = (match.group(1) or match.group(2)).upper()
                start_pos = match.end()
                end_pos = opt_splits[i + 1].start() if i + 1 < len(opt_splits) else len(content_after_num)
                opt_str = content_after_num[start_pos:end_pos].strip()

                is_correct = False
                if detected_correct_letter and letter == detected_correct_letter:
                    is_correct = True
                elif not detected_correct_letter and i == 0:
                    # Default first option if answer not explicitly indicated
                    is_correct = True

                options.append({
                    "option_text": opt_str,
                    "is_correct": is_correct
                })
        else:
            # Subjective question: determine SHORT vs LONG
            if marks >= 8.0 or len(q_text) > 200 or any(k in q_text.lower() for k in ["discuss", "explain in detail", "describe with diagram", "write an essay"]):
                q_type = "LONG_ANSWER"
                if marks == 2.0:
                    marks = 10.0
            else:
                q_type = "SHORT_ANSWER"
                if marks == 2.0:
                    marks = 5.0

        # Clean prompt text
        clean_q_text = re.sub(r"\s+", " ", q_text).strip()
        if len(clean_q_text) < 5:
            continue

        questions.append({
            "question_text": clean_q_text,
            "question_type": q_type,
            "subject": default_subject,
            "difficulty": "MEDIUM",
            "marks": marks,
            "negative_marks": neg_marks,
            "model_answer": f"Answer key: Option {detected_correct_letter}" if detected_correct_letter else None,
            "options": options
        })

    return questions


def parse_questions_from_pdf(file_bytes: bytes, default_subject: str = "General") -> List[dict]:
    """
    Main entrypoint: extracts text from PDF bytes, then parses structured questions
    using GPT-4o (with heuristic fallback).
    """
    text = extract_text_from_pdf(file_bytes)
    if not text.strip():
        return []

    # 1. Try AI-powered parsing with GPT-4o
    llm_result = parse_questions_with_llm(text, default_subject=default_subject)
    if llm_result and len(llm_result) > 0:
        return llm_result

    # 2. Fallback to deterministic regex parser
    return parse_questions_heuristic(text, default_subject=default_subject)
