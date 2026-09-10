"use client";

import React, { useState, useEffect } from "react";
import { createQuestion, listQuestions, deleteQuestion, updateQuestion } from "@/lib/api";

export default function QuestionBankManager() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("ALL");

  // Create state
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("MCQ");
  const [subject, setSubject] = useState("Computer Science");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [marks, setMarks] = useState(2.0);
  const [negativeMarks, setNegativeMarks] = useState(0.5);
  const [modelAnswer, setModelAnswer] = useState("");

  // Edit state & modal
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editType, setEditType] = useState("MCQ");
  const [editSubject, setEditSubject] = useState("");
  const [editDifficulty, setEditDifficulty] = useState("MEDIUM");
  const [editMarks, setEditMarks] = useState(2.0);
  const [editNegativeMarks, setEditNegativeMarks] = useState(0.5);
  const [editModelAnswer, setEditModelAnswer] = useState("");
  const [editOptions, setEditOptions] = useState<any[]>([]);

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

  const handleStartEdit = (q: any) => {
    setEditingQuestion(q);
    setEditPrompt(q.question_text || "");
    setEditType(q.question_type || "MCQ");
    setEditSubject(q.subject || "");
    setEditDifficulty(q.difficulty || "MEDIUM");
    setEditMarks(q.marks || 2.0);
    setEditNegativeMarks(q.negative_marks || 0.0);
    setEditModelAnswer(q.model_answer || "");
    if (q.options && q.options.length > 0) {
      setEditOptions(q.options.map((o: any) => ({ ...o })));
    } else {
      setEditOptions([
        { option_text: "", is_correct: true },
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
      ]);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    setError("");
    setSuccess("");

    try {
      let finalOptions: any[] = [];
      if (editType === "MCQ") {
        finalOptions = editOptions.filter((o) => o.option_text && o.option_text.trim() !== "");
        if (finalOptions.length < 2) {
          alert("MCQ requires at least 2 non-empty options.");
          return;
        }
      }

      await updateQuestion(editingQuestion.id, {
        question_text: editPrompt,
        question_type: editType,
        subject: editSubject,
        difficulty: editDifficulty,
        marks: Number(editMarks),
        negative_marks: Number(editNegativeMarks),
        model_answer: editModelAnswer,
        options: editType === "MCQ" ? finalOptions : [],
      });

      setSuccess(`Question #${editingQuestion.id} updated successfully!`);
      setEditingQuestion(null);
      loadQuestions();
    } catch (err: any) {
      alert(err.message || "Failed to update question.");
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
              placeholder="Type your question prompt, problem statement, or upload instruction..."
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
                <option value="IMAGE_UPLOAD">Handwritten Diagram / Photo Upload</option>
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

          {(questionType === "SHORT_ANSWER" || questionType === "LONG_ANSWER" || questionType === "IMAGE_UPLOAD") && (
            <div className="form-group">
              <label className="form-label">
                {questionType === "IMAGE_UPLOAD" ? "Expected Diagram Features / Rubric (AI Vision Key)" : "Model Answer / Rubric (GPT-4o Evaluator)"}
              </label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder={questionType === "IMAGE_UPLOAD" ? "Key labels, entities, and relationships expected in the diagram..." : "Model answer key used by GPT-4o for first-pass subjective grading..."}
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

      {/* Edit Question Modal Overlay */}
      {editingQuestion && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1.5rem"
        }}>
          <div className="panel-card" style={{ maxWidth: "680px", width: "100%", maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--accent-cyan)" }}>
            <div className="panel-header" style={{ marginBottom: "1rem" }}>
              <h3 className="panel-title">✏️ Edit Question #{editingQuestion.id}</h3>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label className="form-label">Question Prompt</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Question Type</label>
                  <select className="form-select" value={editType} onChange={(e) => setEditType(e.target.value)}>
                    <option value="MCQ">Multiple Choice (MCQ)</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                    <option value="LONG_ANSWER">Long Answer</option>
                    <option value="IMAGE_UPLOAD">Handwritten Diagram / Photo Upload</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input type="text" className="form-input" value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Difficulty</label>
                  <select className="form-select" value={editDifficulty} onChange={(e) => setEditDifficulty(e.target.value)}>
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Max Marks</label>
                  <input type="number" step="0.5" className="form-input" value={editMarks} onChange={(e) => setEditMarks(Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Negative Marks</label>
                  <input type="number" step="0.25" className="form-input" value={editNegativeMarks} onChange={(e) => setEditNegativeMarks(Number(e.target.value))} />
                </div>
              </div>

              {editType === "MCQ" && (
                <div className="form-group">
                  <label className="form-label">Options (Pick radio for correct answer)</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {editOptions.map((opt, idx) => (
                      <div key={idx} className="option-input-row">
                        <input
                          type="radio"
                          name="editCorrectOpt"
                          checked={opt.is_correct}
                          onChange={() => {
                            setEditOptions(editOptions.map((o, i) => ({ ...o, is_correct: i === idx })));
                          }}
                          style={{ width: "18px", height: "18px", accentColor: "#2563eb" }}
                        />
                        <input
                          type="text"
                          className="form-input"
                          style={{ border: "none", background: "transparent" }}
                          placeholder={`Option ${idx + 1}`}
                          value={opt.option_text}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditOptions(editOptions.map((o, i) => (i === idx ? { ...o, option_text: val } : o)));
                          }}
                        />
                        {opt.is_correct && (
                          <span className="badge badge-examiner" style={{ fontSize: "0.7rem" }}>Correct Answer</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(editType === "SHORT_ANSWER" || editType === "LONG_ANSWER" || editType === "IMAGE_UPLOAD") && (
                <div className="form-group">
                  <label className="form-label">Model Answer / Rubric</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={editModelAnswer}
                    onChange={(e) => setEditModelAnswer(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingQuestion(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              {["ALL", "MCQ", "SHORT_ANSWER", "LONG_ANSWER", "IMAGE_UPLOAD"].map((t) => (
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
              <div key={q.id} style={{
                padding: "1.25rem",
                border: "1px solid var(--border-subtle)",
                borderRadius: "12px",
                background: "rgba(15, 23, 42, 0.65)",
                backdropFilter: "blur(12px)",
                boxShadow: "var(--shadow-sm)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div>
                    <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                      <span className="badge badge-student">{q.question_type}</span>
                      <span className="badge badge-examiner">{q.difficulty}</span>
                      <span className="badge badge-admin">+{q.marks} Marks</span>
                      {q.negative_marks > 0 && (
                        <span className="badge badge-danger">-{q.negative_marks} Neg</span>
                      )}
                      {q.subject && (
                        <span className="badge" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8", border: "1px solid rgba(99, 102, 241, 0.3)" }}>{q.subject}</span>
                      )}
                    </div>
                    <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", lineHeight: 1.5 }}>{q.question_text}</h4>
                    {q.model_answer && (
                      <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "0.35rem" }}>
                        <strong style={{ color: "#cbd5e1" }}>Rubric:</strong> {q.model_answer}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => handleStartEdit(q)}
                      className="btn btn-secondary"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="btn btn-danger"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {q.options && q.options.length > 0 && (
                  <div style={{ marginTop: "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.82rem" }}>
                    {q.options.map((opt: any) => (
                      <div
                        key={opt.id || opt.option_text}
                        style={{
                          padding: "0.5rem 0.85rem",
                          borderRadius: "8px",
                          background: opt.is_correct ? "rgba(16, 185, 129, 0.12)" : "rgba(255, 255, 255, 0.03)",
                          border: `1px solid ${opt.is_correct ? "rgba(16, 185, 129, 0.35)" : "var(--border-subtle)"}`,
                          color: opt.is_correct ? "#34d399" : "var(--text-secondary)",
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
