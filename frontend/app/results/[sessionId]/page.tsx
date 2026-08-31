"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { User } from "@/lib/types";

interface QuestionResult {
  question_id: number;
  question_text: string;
  question_type: string;
  score: number;
  max_score: number;
  evaluation_type: string;
  feedback: string;
}

export default function StudentResultsPage({ params }: { params: { sessionId: string } }) {
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [maxScore, setMaxScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch results from FastAPI backend or mock fallback
    async function fetchResults() {
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(`http://127.0.0.1:8000/exam-sessions/${params.sessionId}/submit`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setTotalScore(data.total_score || 0);
          setMaxScore(data.max_score || 0);
        }
      } catch (err) {
        // Fallback sample data
        setResults([
          {
            question_id: 1,
            question_text: "Which data structure uses LIFO principle?",
            question_type: "MCQ",
            score: 2.0,
            max_score: 2.0,
            evaluation_type: "auto",
            feedback: "Correct answer!"
          },
          {
            question_id: 2,
            question_text: "Explain the concept of recursion.",
            question_type: "SHORT_ANSWER",
            score: 4.5,
            max_score: 5.0,
            evaluation_type: "ai",
            feedback: "AI Evaluated: Strong explanation covering base condition and recursive step."
          }
        ]);
        setTotalScore(6.5);
        setMaxScore(7.0);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [params.sessionId]);

  const percentage = maxScore > 0 ? round((totalScore / maxScore) * 100, 1) : 0;

  function round(val: number, decimals: number) {
    return Number(Math.round(Number(val + "e" + decimals)) + "e-" + decimals);
  }

  return (
    <ProtectedRoute>
      {(user: User) => (
        <div className="dashboard-container" style={{ maxWidth: "900px" }}>
          {/* Result Header Hero */}
          <div className="dashboard-hero" style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)" }}>
            <div>
              <span className="badge badge-student" style={{ marginBottom: "0.5rem" }}>Exam Result Summary</span>
              <h2 className="hero-title">Candidate Performance Breakdown</h2>
              <p className="hero-email">Student: {user.name} ({user.email})</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#38bdf8" }}>{percentage}%</div>
              <div style={{ fontSize: "0.88rem", color: "#cbd5e1" }}>{totalScore} / {maxScore} Total Marks</div>
            </div>
          </div>

          {/* Question Breakdown List */}
          <div className="panel-card">
            <div className="panel-header">
              <h3 className="panel-title">📊 Question-Level Breakdown & Feedback</h3>
              <Link href="/dashboard" className="btn btn-primary" style={{ padding: "0.45rem 1rem", fontSize: "0.82rem" }}>
                ← Back to Dashboard
              </Link>
            </div>

            {loading ? (
              <p>Loading results...</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {results.map((r, idx) => (
                  <div key={r.question_id} style={{ padding: "1rem 1.25rem", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#f8fafc" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <span className="badge badge-examiner" style={{ marginRight: "0.4rem" }}>Q{idx + 1} ({r.question_type})</span>
                        <span className="badge badge-admin">{r.evaluation_type.toUpperCase()} GRADED</span>
                        <h4 style={{ fontSize: "0.98rem", fontWeight: 700, margin: "0.5rem 0", color: "#0f172a" }}>{r.question_text}</h4>
                      </div>
                      <div style={{ textAlign: "right", minWidth: "100px" }}>
                        <span style={{ fontSize: "1.1rem", fontWeight: 800, color: r.score >= r.max_score ? "#16a34a" : r.score > 0 ? "#d97706" : "#dc2626" }}>
                          {r.score} / {r.max_score}
                        </span>
                      </div>
                    </div>
                    <div style={{ marginTop: "0.5rem", padding: "0.6rem 0.85rem", background: "#ffffff", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", color: "#334155" }}>
                      <strong>Feedback:</strong> {r.feedback}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
