"use client";

import React, { useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { User } from "@/lib/types";

interface PendingGradingItem {
  id: number;
  studentName: string;
  studentEmail: string;
  questionText: string;
  questionType: string;
  maxMarks: number;
  aiSuggestedScore: number;
  aiJustification: string;
  studentResponse: string;
  ocrText?: string;
  awardedScore: number;
  examinerNotes: string;
}

export default function ExaminerGradingPortal() {
  const [items, setItems] = useState<PendingGradingItem[]>([
    {
      id: 101,
      studentName: "Alice Smith",
      studentEmail: "alice@example.com",
      questionText: "Explain the difference between process and thread in operating systems.",
      questionType: "SHORT_ANSWER",
      maxMarks: 5.0,
      aiSuggestedScore: 4.5,
      aiJustification: "AI Evaluated: Addressed separate memory space for processes and shared memory execution for threads.",
      studentResponse: "A process is an execution of a program with its own memory space. A thread is a lightweight execution unit sharing the parent process memory.",
      awardedScore: 4.5,
      examinerNotes: "Accurate concise response."
    },
    {
      id: 102,
      studentName: "Bob Jones",
      studentEmail: "bob@example.com",
      questionText: "Upload handwritten calculation for derivative of f(x) = x^3 + 2x.",
      questionType: "IMAGE_UPLOAD",
      maxMarks: 10.0,
      aiSuggestedScore: 8.0,
      aiJustification: "OCR Pre-processing complete. Steps verified.",
      studentResponse: "[Handwritten Image Script Uploaded]",
      ocrText: "f'(x) = 3x^2 + 2. Step 1: Power rule 3*x^(3-1) = 3x^2. Step 2: d/dx(2x) = 2.",
      awardedScore: 9.0,
      examinerNotes: "Steps clearly shown in handwritten script."
    }
  ]);

  const [published, setPublished] = useState(false);

  const handleScoreChange = (id: number, score: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, awardedScore: score } : item))
    );
  };

  const handleNotesChange = (id: number, notes: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, examinerNotes: notes } : item))
    );
  };

  const handlePublishResults = () => {
    setPublished(true);
    alert("Results successfully published to Student Portals!");
  };

  return (
    <ProtectedRoute>
      {(user: User) => (
        <div className="dashboard-container">
          {/* Header */}
          <div className="dashboard-hero" style={{ background: "linear-gradient(135deg, #065f46, #047857)" }}>
            <div>
              <span className="badge badge-examiner" style={{ background: "#ffffff", color: "#065f46" }}>Examiner Hub</span>
              <h2 className="hero-title">Subjective Answer Grading Queue</h2>
              <p className="hero-email">Review GPT-4o AI Scores, OCR Handwritten Scripts & Override Marks</p>
            </div>
            <div>
              <button
                onClick={handlePublishResults}
                className="btn btn-primary"
                style={{ background: "#ffffff", color: "#065f46", fontWeight: 800 }}
              >
                {published ? "✓ Results Published" : "🚀 Publish Results"}
              </button>
            </div>
          </div>

          {/* Pending Submissions Queue */}
          <div className="panel-card">
            <div className="panel-header">
              <h3 className="panel-title">📝 Submissions Awaiting Examiner Review ({items.length})</h3>
              <Link href="/dashboard" className="btn btn-primary" style={{ padding: "0.45rem 1rem", fontSize: "0.82rem" }}>
                ← Back to Dashboard
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {items.map((item) => (
                <div key={item.id} style={{ padding: "1.25rem", border: "1.5px solid #cbd5e1", borderRadius: "12px", background: "#ffffff" }}>
                  {/* Student & Question Info */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                    <div>
                      <h4 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>{item.questionText}</h4>
                      <p style={{ fontSize: "0.82rem", color: "#64748b" }}>Candidate: <strong>{item.studentName}</strong> ({item.studentEmail})</p>
                    </div>
                    <span className="badge badge-student">{item.questionType}</span>
                  </div>

                  {/* Student Response Box */}
                  <div style={{ padding: "0.85rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "0.85rem" }}>
                    <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.25rem" }}>Student Response:</p>
                    <p style={{ fontSize: "0.9rem", color: "#0f172a" }}>{item.studentResponse}</p>

                    {item.ocrText && (
                      <div style={{ marginTop: "0.5rem", padding: "0.6rem", background: "#ecfeff", border: "1px solid #a5f3fc", borderRadius: "6px", fontSize: "0.82rem", color: "#0e7490" }}>
                        🔍 <strong>OCR Extracted Legible Text:</strong> {item.ocrText}
                      </div>
                    )}
                  </div>

                  {/* AI Suggested Score & Justification */}
                  <div style={{ padding: "0.85rem", background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "8px", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#7e22ce" }}>
                        🤖 GPT-4o Suggested Score: {item.aiSuggestedScore} / {item.maxMarks}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.82rem", color: "#581c87", marginTop: "0.25rem" }}>
                      <strong>Justification:</strong> {item.aiJustification}
                    </p>
                  </div>

                  {/* Examiner Override Controls */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem", alignItems: "center", background: "#f1f5f9", padding: "0.85rem", borderRadius: "8px" }}>
                    <div>
                      <label className="form-label">Final Awarded Marks (Override)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={item.maxMarks}
                        className="form-input"
                        value={item.awardedScore}
                        onChange={(e) => handleScoreChange(item.id, Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="form-label">Examiner Annotation / Feedback</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Add examiner feedback notes for candidate..."
                        value={item.examinerNotes}
                        onChange={(e) => handleNotesChange(item.id, e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
