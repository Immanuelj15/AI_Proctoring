"use client";

import React, { useState, useEffect } from "react";
import { createExam, listExams, listQuestions, addQuestionToExam, removeQuestionFromExam } from "@/lib/api";

export default function ExamManager() {
  const [exams, setExams] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Computer Science");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [proctoringEnabled, setProctoringEnabled] = useState(true);
  const [randomizationEnabled, setRandomizationEnabled] = useState(false);
  const [negativeMarkingEnabled, setNegativeMarkingEnabled] = useState(false);
  const [gazeSensitivity, setGazeSensitivity] = useState("medium");
  const [maxTabWarnings, setMaxTabWarnings] = useState(3);

  // Question Attachment State
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [orderIndex, setOrderIndex] = useState<number>(1);
  const [expandedExamId, setExpandedExamId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eData, qData] = await Promise.all([listExams(), listQuestions()]);
      setExams(eData);
      setQuestions(qData);
    } catch (err: any) {
      setError("Failed to load exams or questions.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!title.trim()) {
      setError("Exam title is required.");
      return;
    }

    try {
      await createExam({
        title,
        subject,
        duration_minutes: Number(durationMinutes),
        proctoring_enabled: proctoringEnabled,
        randomization_enabled: randomizationEnabled,
        negative_marking_enabled: negativeMarkingEnabled,
        gaze_sensitivity: gazeSensitivity,
        max_tab_switch_warnings: Number(maxTabWarnings),
      });

      setSuccess("Exam configuration created successfully!");
      setTitle("");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to create exam.");
    }
  };

  const handleAttachQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId || !selectedQuestionId) {
      alert("Please select both an Exam and a Question.");
      return;
    }

    try {
      await addQuestionToExam(selectedExamId, selectedQuestionId, Number(orderIndex));
      alert(`Question attached to Exam at position #${orderIndex}!`);
      setOrderIndex(prev => prev + 1);
      loadData();
    } catch (err: any) {
      alert("Failed to attach question.");
    }
  };

  const handleDetachQuestion = async (examId: number, questionId: number) => {
    if (!confirm("Are you sure you want to detach this question from the exam?")) return;
    try {
      await removeQuestionFromExam(examId, questionId);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to detach question.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Create Exam Form */}
      <div className="panel-card">
        <div className="panel-header">
          <h3 className="panel-title">📝 Create New Exam Configuration</h3>
          <span className="badge badge-examiner">Exam Settings</span>
        </div>

        {error && <div className="alert-banner error"><span>⚠️</span> {error}</div>}
        {success && <div className="alert-banner success"><span>✓</span> {success}</div>}

        <form onSubmit={handleCreateExam}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Exam Paper Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="Midterm Computer Science Assessment"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                type="text"
                className="form-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Duration (Minutes)</label>
              <input
                type="number"
                className="form-input"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                min={5}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Gaze Sensitivity</label>
              <select className="form-select" value={gazeSensitivity} onChange={(e) => setGazeSensitivity(e.target.value)}>
                <option value="low">Low Sensitivity</option>
                <option value="medium">Medium Sensitivity</option>
                <option value="high">High Sensitivity</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Max Tab Tolerance</label>
              <input
                type="number"
                className="form-input"
                value={maxTabWarnings}
                onChange={(e) => setMaxTabWarnings(Number(e.target.value))}
                min={1}
              />
            </div>
          </div>

          {/* Exam Policy & Proctoring Toggles */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", margin: "1rem 0", padding: "1rem", background: "rgba(255, 255, 255, 0.02)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={proctoringEnabled}
                onChange={(e) => setProctoringEnabled(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "#2563eb" }}
              />
              <span style={{ fontSize: "0.9rem", color: "#e2e8f0" }}>
                🛡️ <strong>Enable AI Proctoring</strong> (Real-Time Face Gaze, Multiple Persons, Audio Decibels & Tab Switches)
              </span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={randomizationEnabled}
                onChange={(e) => setRandomizationEnabled(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "#2563eb" }}
              />
              <span style={{ fontSize: "0.9rem", color: "#e2e8f0" }}>
                🔀 <strong>Randomize Question Order</strong> (Shuffles question sequence per student session)
              </span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={negativeMarkingEnabled}
                onChange={(e) => setNegativeMarkingEnabled(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "#2563eb" }}
              />
              <span style={{ fontSize: "0.9rem", color: "#e2e8f0" }}>
                ⚠️ <strong>Enforce Negative Marking</strong> (Applies question-level penalty for incorrect submissions)
              </span>
            </label>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "auto", padding: "0.75rem 2rem", marginTop: "0.5rem" }}>
            Create Exam Configuration
          </button>
        </form>
      </div>

      {/* Attach Question to Exam */}
      <div className="panel-card">
        <div className="panel-header">
          <h3 className="panel-title">🔗 Attach Questions to Exam</h3>
        </div>

        <form onSubmit={handleAttachQuestion} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.5fr 0.8fr auto", gap: "1rem", alignItems: "end" }}>
          <div>
            <label className="form-label">Target Exam</label>
            <select
              className="form-select"
              onChange={(e) => setSelectedExamId(Number(e.target.value))}
              defaultValue=""
            >
              <option value="" disabled>-- Select Configured Exam --</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.title} (#{ex.id})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Target Question</label>
            <select
              className="form-select"
              onChange={(e) => setSelectedQuestionId(Number(e.target.value))}
              defaultValue=""
            >
              <option value="" disabled>-- Select Question from Bank --</option>
              {questions.map((q) => (
                <option key={q.id} value={q.id}>[{q.question_type}] {q.question_text.slice(0, 45)}...</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Sequence #</label>
            <input
              type="number"
              min={1}
              className="form-input"
              value={orderIndex}
              onChange={(e) => setOrderIndex(Number(e.target.value))}
              placeholder="1"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: "0.75rem 1.5rem" }}>
            Attach Question
          </button>
        </form>
      </div>

      {/* List Configured Exams */}
      <div className="panel-card">
        <div className="panel-header">
          <h3 className="panel-title">📋 Configured Exams ({exams.length})</h3>
        </div>

        {loading ? (
          <p>Loading exams...</p>
        ) : exams.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>No exams created yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {exams.map((ex) => {
              const isExpanded = expandedExamId === ex.id;
              const attachedQuestions = (ex.exam_questions || []).slice().sort(
                (a: any, b: any) => (a.question_order || 0) - (b.question_order || 0)
              );

              return (
                <div key={ex.id} style={{
                  padding: "1.25rem",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "12px",
                  background: "rgba(15, 23, 42, 0.65)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "var(--shadow-sm)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                        <span className="badge badge-examiner">{ex.duration_minutes} Mins</span>
                        <span className={`badge ${ex.proctoring_enabled ? "badge-admin" : "badge-danger"}`}>
                          {ex.proctoring_enabled ? "🛡️ AI Proctoring On" : "Proctoring Off"}
                        </span>
                        {ex.randomization_enabled && (
                          <span className="badge badge-student">🔀 Random Order</span>
                        )}
                        {ex.negative_marking_enabled && (
                          <span className="badge badge-danger">⚠️ Neg Marking</span>
                        )}
                      </div>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>{ex.title}</h4>
                      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                        Subject: <strong style={{ color: "var(--primary-cyan)" }}>{ex.subject || "General"}</strong> | 
                        Attached Questions: <strong style={{ color: "#34d399" }}>{attachedQuestions.length || ex.question_count || 0}</strong> | 
                        Gaze Tolerance: <strong style={{ color: "#e2e8f0" }}>{ex.gaze_sensitivity}</strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setExpandedExamId(isExpanded ? null : ex.id)}
                      style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem" }}
                    >
                      {isExpanded ? "▲ Hide Questions" : `▼ View Questions (${attachedQuestions.length})`}
                    </button>
                  </div>

                  {/* Attached Questions Accordion Panel */}
                  {isExpanded && (
                    <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)" }}>
                      <h5 style={{ fontSize: "0.88rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.75rem" }}>
                        Attached Questions ({attachedQuestions.length})
                      </h5>

                      {attachedQuestions.length === 0 ? (
                        <p style={{ fontSize: "0.82rem", color: "#64748b" }}>
                          No questions attached yet. Use the "Attach Questions to Exam" form above to link questions from the Question Bank.
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                          {attachedQuestions.map((eq: any, idx: number) => {
                            const q = eq.question || {};
                            return (
                              <div
                                key={eq.id || `${ex.id}-${eq.question_id}`}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "0.75rem 1rem",
                                  background: "rgba(255, 255, 255, 0.03)",
                                  border: "1px solid var(--border-subtle)",
                                  borderRadius: "8px",
                                  gap: "0.75rem"
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
                                  <span style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "50%",
                                    background: "rgba(37, 99, 235, 0.25)",
                                    color: "#60a5fa",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    flexShrink: 0
                                  }}>
                                    {eq.question_order || idx + 1}
                                  </span>
                                  <span className="badge badge-student" style={{ fontSize: "0.7rem", flexShrink: 0 }}>
                                    {q.question_type || "QUESTION"}
                                  </span>
                                  <span style={{
                                    fontSize: "0.85rem",
                                    color: "#e2e8f0",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap"
                                  }}>
                                    {q.question_text || `Question ID #${eq.question_id}`}
                                  </span>
                                  <span style={{ fontSize: "0.78rem", color: "#34d399", marginLeft: "auto", flexShrink: 0 }}>
                                    +{q.marks || 0} pts
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDetachQuestion(ex.id, eq.question_id)}
                                  className="btn btn-danger"
                                  style={{ padding: "0.3rem 0.65rem", fontSize: "0.74rem", flexShrink: 0 }}
                                >
                                  🗑️ Detach
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
