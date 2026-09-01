"use client";

import React, { useState, useEffect } from "react";
import { createQuestion, listQuestions, deleteQuestion } from "@/lib/api";

export default function QuestionBankManager() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("ALL");

  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("MCQ");
  const [subject, setSubject] = useState("Computer Science");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [marks, setMarks] = useState(2.0);
  const [negativeMarks, setNegativeMarks] = useState(0.5);
  const [modelAnswer, setModelAnswer] = useState("");

  const [opt1, setOpt1] = useState("");
  const [opt2, setOpt2] = useState("");
  const [opt3, setOpt3] = useState("");
  const [opt4, setOpt4] = useState("");
  const [correctOptIndex, setCorrectOptIndex] = useState(0);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await listQuestions();
      setQuestions(data);
    } catch (err: any) {
      setError("Failed to load question bank.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!questionText.trim()) {
      setError("Question prompt is required.");
      return;
    }

    let optionsPayload: any[] = [];
    if (questionType === "MCQ") {
      const optTexts = [opt1, opt2, opt3, opt4].filter((t) => t.trim() !== "");
      if (optTexts.length < 2) {
        setError("Please provide at least 2 options for an MCQ.");
        return;
      }
      optionsPayload = [
        { option_text: opt1, is_correct: correctOptIndex === 0 },
        { option_text: opt2, is_correct: correctOptIndex === 1 },
        opt3 ? { option_text: opt3, is_correct: correctOptIndex === 2 } : null,
        opt4 ? { option_text: opt4, is_correct: correctOptIndex === 3 } : null,
      ].filter(Boolean);
    }

    try {
      await createQuestion({
        question_text: questionText,
        question_type: questionType,
        subject,
        difficulty,
        marks: Number(marks),
        negative_marks: Number(negativeMarks),
        model_answer: modelAnswer,
        options: optionsPayload,
      });

      setSuccess("Question added to Question Bank!");
      setQuestionText("");
      setModelAnswer("");
      setOpt1("");
      setOpt2("");
      setOpt3("");
      setOpt4("");
      loadQuestions();
    } catch (err: any) {
      setError(err.message || "Failed to create question.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      await deleteQuestion(id);
      loadQuestions();
    } catch (err: any) {
      alert("Failed to delete question.");
    }
  };

  // Filtered Questions list
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (q.subject && q.subject.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === "ALL" || q.question_type === typeFilter;
    const matchesDifficulty = difficultyFilter === "ALL" || q.difficulty === difficultyFilter;
    return matchesSearch && matchesType && matchesDifficulty;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Add New Question Form */}
      <div className="panel-card">
        <div className="panel-header">
          <h3 className="panel-title">➕ Add Question to Question Bank</h3>
          <span className="badge badge-student">Examiner Hub</span>
        </div>

        {error && <div className="alert-banner error"><span>⚠️</span> {error}</div>}
        {success && <div className="alert-banner success"><span>✓</span> {success}</div>}

        <form onSubmit={handleCreateQuestion}>
          <div className="form-group">
            <label className="form-label">Question Prompt</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Type your question prompt or code snippet here..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Question Type</label>
              <select className="form-select" value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
                <option value="MCQ">Multiple Choice (MCQ)</option>
                <option value="SHORT_ANSWER">Short Answer</option>
                <option value="LONG_ANSWER">Long Answer</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Subject Tag</label>
              <input type="text" className="form-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Difficulty Level</label>
              <select className="form-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Max Marks</label>
              <input type="number" step="0.5" className="form-input" value={marks} onChange={(e) => setMarks(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Negative Marking Deduction</label>
              <input type="number" step="0.25" className="form-input" value={negativeMarks} onChange={(e) => setNegativeMarks(Number(e.target.value))} />
            </div>
          </div>

          {questionType === "MCQ" && (
            <div className="form-group">
              <label className="form-label">MCQ Options (Select the Radio Button for Correct Answer)</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[
                  { val: opt1, set: setOpt1, idx: 0 },
                  { val: opt2, set: setOpt2, idx: 1 },
                  { val: opt3, set: setOpt3, idx: 2 },
                  { val: opt4, set: setOpt4, idx: 3 },
                ].map((item) => (
                  <div key={item.idx} className="option-input-row">
                    <input
                      type="radio"
                      name="correctOpt"
                      checked={correctOptIndex === item.idx}
                      onChange={() => setCorrectOptIndex(item.idx)}
                      style={{ width: "18px", height: "18px", accentColor: "#2563eb" }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      style={{ border: "none", background: "transparent" }}
                      placeholder={`Option ${item.idx + 1}`}
                      value={item.val}
                      onChange={(e) => item.set(e.target.value)}
                    />
                    {correctOptIndex === item.idx && (
                      <span className="badge badge-examiner" style={{ fontSize: "0.7rem" }}>Correct Answer</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(questionType === "SHORT_ANSWER" || questionType === "LONG_ANSWER") && (
            <div className="form-group">
              <label className="form-label">Model Answer / Rubric (Used by GPT-4o Evaluator)</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Model answer key used by GPT-4o for first-pass subjective grading..."
                value={modelAnswer}
                onChange={(e) => setModelAnswer(e.target.value)}
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: "auto", padding: "0.75rem 2rem", marginTop: "0.5rem" }}>
            Add Question to Bank
          </button>
        </form>
      </div>

      {/* Question Bank Explorer with Search & Filter Chips */}
      <div className="panel-card">
        <div className="panel-header">
          <h3 className="panel-title">📚 Question Bank Explorer ({filteredQuestions.length})</h3>
        </div>

        {/* Live Search & Filter Bar */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div className="form-group">
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Search questions by keyword or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
            <div className="filter-chip-bar">
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", display: "inline-flex", alignItems: "center" }}>Type:</span>
              {["ALL", "MCQ", "SHORT_ANSWER", "LONG_ANSWER"].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`filter-chip ${typeFilter === t ? "active" : ""}`}
                  onClick={() => setTypeFilter(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="filter-chip-bar">
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", display: "inline-flex", alignItems: "center" }}>Difficulty:</span>
              {["ALL", "EASY", "MEDIUM", "HARD"].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`filter-chip ${difficultyFilter === d ? "active" : ""}`}
                  onClick={() => setDifficultyFilter(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <p>Loading questions...</p>
        ) : filteredQuestions.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>No matching questions found.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {filteredQuestions.map((q) => (
              <div key={q.id} style={{ padding: "1rem 1.25rem", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#ffffff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem" }}>
                      <span className="badge badge-student">{q.question_type}</span>
                      <span className="badge badge-examiner">{q.difficulty}</span>
                      <span className="badge badge-admin">+{q.marks} Marks</span>
                    </div>
                    <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>{q.question_text}</h4>
                  </div>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="btn btn-danger"
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}
                  >
                    Delete
                  </button>
                </div>
                {q.options && q.options.length > 0 && (
                  <div style={{ marginTop: "0.6rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", fontSize: "0.82rem" }}>
                    {q.options.map((opt: any) => (
                      <div
                        key={opt.id}
                        style={{
                          padding: "0.4rem 0.75rem",
                          borderRadius: "6px",
                          background: opt.is_correct ? "#ecfdf5" : "#f8fafc",
                          border: `1px solid ${opt.is_correct ? "#a7f3d0" : "#e2e8f0"}`,
                          color: opt.is_correct ? "#065f46" : "#334155",
                          fontWeight: opt.is_correct ? 700 : 400
                        }}
                      >
                        {opt.is_correct ? "✓ " : "• "}{opt.option_text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
