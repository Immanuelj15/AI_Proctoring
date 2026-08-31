"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import QuestionBankManager from "@/components/examiner/QuestionBankManager";
import ExamManager from "@/components/examiner/ExamManager";
import ExamInterface from "@/components/exam/ExamInterface";
import ExamInstructionsModal from "@/components/exam/ExamInstructionsModal";
import { removeToken } from "@/lib/auth";
import { listQuestions, listExams } from "@/lib/api";
import { User, UserRole } from "@/lib/types";

const sampleQuestions = [
  {
    id: "q-1",
    orderIndex: 1,
    subject: "Computer Science",
    type: "MCQ" as const,
    content: "Which data structure uses LIFO (Last In First Out) principle?",
    marks: 2.0,
    negativeMarks: 0.5,
    options: [
      { id: "opt-1", option_text: "Queue" },
      { id: "opt-2", option_text: "Stack" },
      { id: "opt-3", option_text: "Binary Tree" },
      { id: "opt-4", option_text: "Array" },
    ],
  },
  {
    id: "q-2",
    orderIndex: 2,
    subject: "Computer Science",
    type: "SHORT_ANSWER" as const,
    content: "Explain the difference between process and thread in operating systems.",
    marks: 5.0,
    negativeMarks: 0.0,
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"questions" | "exams" | "simulation">("questions");
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [examCount, setExamCount] = useState<number>(0);
  const [selectedExamForModal, setSelectedExamForModal] = useState<any | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [qData, eData] = await Promise.all([listQuestions(), listExams()]);
        setQuestionCount(qData.length);
        setExamCount(eData.length);
      } catch (err) {
        // Fallback stats
      }
    }
    fetchStats();
  }, []);

  const handleLogout = () => {
    removeToken();
    router.push("/login");
  };

  const handleLaunchFullscreenExam = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    setSelectedExamForModal(null);
    router.push("/exam/sim-session-1");
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
                durationMinutes={selectedExamForModal.duration}
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
                    <p className="hero-email">Signed in as {user.email} | Phone: {candidateUser.phone_number}</p>
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
                  <div className="metric-label">Candidate Room</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon" style={{ background: "#ecfeff", color: "#0891b2" }}>🛡️</div>
                <div>
                  <div className="metric-value" style={{ fontSize: "1.1rem", color: "#0891b2" }}>MediaPipe</div>
                  <div className="metric-label">AI Proctor Monitoring</div>
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
                <button
                  className={`segment-item ${activeTab === "simulation" ? "active" : ""}`}
                  onClick={() => setActiveTab("simulation")}
                >
                  🎓 Live Exam Simulator
                </button>
              </div>
            )}

            {/* Main Panel View */}
            {isExaminerOrAdmin ? (
              <>
                {activeTab === "questions" && <QuestionBankManager />}
                {activeTab === "exams" && <ExamManager />}
                {activeTab === "simulation" && (
                  <div className="panel-card">
                    <ExamInterface
                      sessionId="sim-session-1"
                      subjectName="Computer Science Midterm"
                      durationMinutes={30}
                      questions={sampleQuestions}
                      onSubmitExam={(ans) => alert("Exam Submitted! Answers: " + JSON.stringify(ans))}
                    />
                  </div>
                )}
              </>
            ) : (
              /* Candidate Scheduled Exams View */
              <div className="panel-card">
                <div className="panel-header">
                  <h3 className="panel-title">🎓 Scheduled Candidate Examinations</h3>
                  <span className="badge badge-student">AI Proctor Monitored</span>
                </div>
                <p style={{ color: "#475569", marginBottom: "1.25rem", fontSize: "0.88rem" }}>
                  Select a scheduled examination paper below to review instructions and start your proctored exam session.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  {[
                    { title: "Computer Science Midterm", duration: 30, subject: "Computer Science", questions: 10 },
                    { title: "Operating Systems & Networking", duration: 45, subject: "Computer Science", questions: 15 },
                  ].map((ex, idx) => (
                    <div key={idx} style={{
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
                          <span className="badge badge-examiner">{ex.subject}</span>
                          <span className="badge badge-student">⏱ {ex.duration} Mins</span>
                        </div>
                        <h4 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>{ex.title}</h4>
                        <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.3rem" }}>
                          Total Questions: <strong>{ex.questions}</strong> | Fullscreen Lock & MediaPipe Enabled
                        </p>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setSelectedExamForModal(ex)}
                      >
                        Start Proctored Exam →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }}
    </ProtectedRoute>
  );
}
