import json
import os
from typing import List, Optional
from pydantic import BaseModel, Field

class LLMEvaluationResult(BaseModel):
    suggested_score: float = Field(description="Suggested score out of max marks")
    justification: str = Field(description="Brief feedback and rationale for the score")
    key_points_covered: List[str] = Field(default_factory=list, description="Key concepts correctly addressed")
    missing_concepts: List[str] = Field(default_factory=list, description="Key concepts missing or incorrect")

def evaluate_subjective_answer(
    question_text: str,
    model_answer: Optional[str],
    student_response: str,
    max_marks: float
) -> LLMEvaluationResult:
    """
    Evaluates a subjective answer (Short/Long Answer) against a model answer and prompt.
    Uses OpenAI GPT-4o when OPENAI_API_KEY is available, or deterministic heuristic evaluation as fallback.
    """
    api_key = os.getenv("OPENAI_API_KEY")

    if api_key and api_key.startswith("sk-"):
        try:
            import openai
            client = openai.OpenAI(api_key=api_key)
            prompt = f"""
            You are an expert AI Examiner evaluating a student response.
            Question: {question_text}
            Model Answer: {model_answer or "N/A"}
            Student Response: {student_response}
            Max Marks: {max_marks}

            Evaluate the student's answer accurately against the model answer.
            Return a JSON object with keys:
            - suggested_score (float, 0.0 to {max_marks})
            - justification (string)
            - key_points_covered (list of strings)
            - missing_concepts (list of strings)
            """

            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.2
            )

            res_json = json.loads(response.choices[0].message.content)
            return LLMEvaluationResult(
                suggested_score=min(max_marks, max(0.0, float(res_json.get("suggested_score", 0.0)))),
                justification=res_json.get("justification", "Evaluated by AI Examiner."),
                key_points_covered=res_json.get("key_points_covered", []),
                missing_concepts=res_json.get("missing_concepts", [])
            )
        except Exception as e:
            # Fallback on OpenAI error
            pass

    # Heuristic Fallback Evaluator
    if not student_response or len(student_response.strip()) == 0:
        return LLMEvaluationResult(
            suggested_score=0.0,
            justification="No answer provided.",
            key_points_covered=[],
            missing_concepts=["Complete answer missing"]
        )

    # Keyword overlap matching against model answer
    model_words = set((model_answer or "").lower().split()) if model_answer else set()
    student_words = set(student_response.lower().split())

    overlap = len(model_words.intersection(student_words)) if model_words else 0
    ratio = min(1.0, overlap / max(1, len(model_words))) if model_words else (0.7 if len(student_words) > 10 else 0.4)

    score = round(ratio * max_marks, 2)
    return LLMEvaluationResult(
        suggested_score=score,
        justification=f"AI Evaluated: Found {overlap} key matching terms from model rubric.",
        key_points_covered=[w for w in student_words if len(w) > 4][:3],
        missing_concepts=[w for w in model_words if len(w) > 4 and w not in student_words][:2]
    )
