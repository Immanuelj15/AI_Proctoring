"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import QuestionBankManager from "@/components/examiner/QuestionBankManager";
import ExamManager from "@/components/examiner/ExamManager";
import ExamInstructionsModal from "@/components/exam/ExamInstructionsModal";
import { removeToken } from "@/lib/auth";
import { listQuestions, listExams, startExamSession } from "@/lib/api";
import { User, UserRole } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"questions" | "exams">("questions");
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [examCount, setExamCount] = useState<number>(0);
  const [examsList, setExamsList] = useState<any[]>([]);
  const [selectedExamForModal, setSelectedExamForModal] = useState<any | null>(null);
  const [startingSession, setStartingSession] = useState<boolean>(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [qData, eData] = await Promise.all([listQuestions(), listExams()]);
        setQuestionCount(qData.length);
        setExamCount(eData.length);
        setExamsList(eData);
      } catch (err) {
        // Fallback default list
        setExamsList([
          { id: 1, title: "Computer Science Midterm", duration_minutes: 30, subject: "Computer Science", question_count: 10 },
          { id: 2, title: "Operating Systems & Networking", duration_minutes: 45, subject: "Computer Science", question_count: 15 },
        ]);
      }
    }
    fetchStats();
  }, []);

  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  const handleLaunchFullscreenExam = async () => {
    if (!selectedExamForModal) return;
    setStartingSession(true);

    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }

      // Start dynamic session in FastAPI backend
      const sessionData = await startExamSession(selectedExamForModal.id);
      const targetSessionId = sessionData.session_id || `session-${selectedExamForModal.id}`;

      // Save active session data to localStorage for the exam room
      if (sessionData.questions) {
        localStorage.setItem(`session_questions_${targetSessionId}`, JSON.stringify(sessionData.questions));
      }

      setSelectedExamForModal(null);
      router.push(`/exam/${targetSessionId}`);
    } catch (err: any) {
      // Fallback redirect if backend is offline or fallback exam ID
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      const fallbackId = selectedExamForModal.id ? `exam-${selectedExamForModal.id}` : "sim-session-1";
      setSelectedExamForModal(null);
      router.push(`/exam/${fallbackId}`);
    } finally {
      setStartingSession(false);
    }
  };

  const getBadgeClass = (role: UserRole) => {
    switch (role) {
      case "student":
        return "badge badge-student";
      case "examiner":
        return "badge badge-examiner";
      case "admin":
        return "badge badge-admin";
      default:
        return "badge";
    }
  };

  return (
    <ProtectedRoute>
      {(user: User) => {
        const isExaminerOrAdmin = user.role === "examiner" || user.role === "admin";
        const candidateUser = {
          ...user,
          phone_number: user.phone_number || "+1 (555) 019-2831"
        };

        return (
          <div className="dashboard-container">
            {/* Pre-Exam Instructions Modal */}
            {selectedExamForModal && (
              <ExamInstructionsModal
                examTitle={selectedExamForModal.title}
                durationMinutes={selectedExamForModal.duration_minutes || selectedExamForModal.duration || 30}
                candidate={candidateUser}
                onAgreeAndStart={handleLaunchFullscreenExam}
                onCancel={() => setSelectedExamForModal(null)}
              />
            )}

            {/* Dashboard Hero Banner */}
            <div className="dashboard-hero">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{
                    width: "42px",
                    height: "42px",
                    background: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.2rem"
                  }}>
                    👤
                  </div>
                  <div>
                    <h2 className="hero-title">Welcome, {user.name} 👋</h2>
                    <p className="hero-email">Signed in as {user.email} | Role: {user.role.toUpperCase()}</p>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem", zIndex: 2 }}>
                <span className={getBadgeClass(user.role)}>{user.role}</span>
                <button onClick={handleLogout} className="btn btn-danger" style={{ padding: "0.55rem 1.25rem" }}>
                  Logout Session
                </button>
              </div>
            </div>

            {/* Metric Stats Cards Grid */}
            <div className="stats-grid">
              <div className="metric-card">
                <div className="metric-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>📚</div>
                <div>
                  <div className="metric-value">{questionCount}</div>
                  <div className="metric-label">Question Bank Items</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>📝</div>
                <div>
                  <div className="metric-value">{examCount}</div>
                  <div className="metric-label">Configured Exams</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon" style={{ background: "#faf5ff", color: "#9333ea" }}>🎓</div>
                <div>
                  <div className="metric-value">Active</div>
                  <div className="metric-label">System Status</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon" style={{ background: "#ecfeff", color: "#0891b2" }}>🛡️</div>
                <div>
                  <div className="metric-value" style={{ fontSize: "1.1rem", color: "#0891b2" }}>MediaPipe</div>
                  <div className="metric-label">AI Proctor Engine</div>
                </div>
              </div>
            </div>

            {/* Segment Control Pill Bar for Examiners */}
            {isExaminerOrAdmin && (
              <div className="segment-bar">
                <button
                  className={`segment-item ${activeTab === "questions" ? "active" : ""}`}
                  onClick={() => setActiveTab("questions")}
                >
                  📚 Question Bank Manager
                </button>
                <button
                  className={`segment-item ${activeTab === "exams" ? "active" : ""}`}
                  onClick={() => setActiveTab("exams")}
                >
                  📝 Exam Configurator
                </button>
              </div>
            )}

            {/* Main Panel View */}
            {isExaminerOrAdmin ? (
              <>
                {activeTab === "questions" && <QuestionBankManager />}
                {activeTab === "exams" && <ExamManager />}
              </>
            ) : (
              /* Candidate Scheduled Exams View */
              <div className="panel-card">
                <div className="panel-header">
                  <h3 className="panel-title">🎓 Scheduled Candidate Examinations</h3>
                  <span className="badge badge-student">AI Proctor Monitored</span>
                </div>
                <p style={{ color: "#475569", marginBottom: "1.25rem", fontSize: "0.88rem" }}>
                  Below are the examination papers configured by Examiners. Select a scheduled paper to start your proctored exam session.
                </p>

                {examsList.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                    <p style={{ color: "#64748b", fontSize: "0.9rem" }}>No exams configured yet by Examiners.</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    {examsList.map((ex) => (
                      <div key={ex.id} style={{
                        padding: "1.25rem",
                        background: "#ffffff",
                        border: "1.5px solid #e2e8f0",
                        borderRadius: "14px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "1rem"
                      }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                            <span className="badge badge-examiner">{ex.subject || "General"}</span>
                            <span className="badge badge-student">⏱ {ex.duration_minutes || ex.duration || 30} Mins</span>
                          </div>
                          <h4 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>{ex.title}</h4>
                          <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.3rem" }}>
                            Total Questions: <strong>{ex.question_count || ex.questions || 5}</strong> | Fullscreen Lock & MediaPipe Enabled
                          </p>
                        </div>

                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={startingSession}
                          onClick={() => setSelectedExamForModal(ex)}
                        >
                          {startingSession ? "Starting Session..." : "Start Proctored Exam →"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }}
    </ProtectedRoute>
  );
}
