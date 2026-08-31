"use client";

import React, { useState, useEffect } from "react";
import { createExam, listExams, listQuestions, addQuestionToExam } from "@/lib/api";

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
  const [gazeSensitivity, setGazeSensitivity] = useState("medium");
  const [maxTabWarnings, setMaxTabWarnings] = useState(3);

  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);

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
      await addQuestionToExam(selectedExamId, selectedQuestionId);
      alert("Question attached to Exam!");
      loadData();
    } catch (err: any) {
      alert("Failed to attach question.");
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

        <form onSubmit={handleAttachQuestion} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "1rem", alignItems: "end" }}>
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
                <option key={q.id} value={q.id}>[{q.question_type}] {q.question_text.slice(0, 40)}...</option>
              ))}
            </select>
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
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {exams.map((ex) => (
              <div key={ex.id} style={{ padding: "1rem 1.25rem", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#ffffff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>{ex.title}</h4>
                  <span className="badge badge-examiner">{ex.duration_minutes} Mins</span>
                </div>
                <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.3rem" }}>
                  Subject: <strong>{ex.subject || "N/A"}</strong> | Attached Questions: <strong>{ex.question_count}</strong> | Proctoring: <strong>{ex.proctoring_enabled ? "Enabled" : "Disabled"}</strong>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
