"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import QuestionBankManager from "@/components/examiner/QuestionBankManager";
import ExamManager from "@/components/examiner/ExamManager";
import ExamInstructionsModal from "@/components/exam/ExamInstructionsModal";
import HybridReviewQueue from "@/components/examiner/HybridReviewQueue";
import { removeToken } from "@/lib/auth";
import { listQuestions, listExams, startExamSession, listUsers, approveUser } from "@/lib/api";
import { User, UserRole } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"questions" | "exams" | "approvals" | "review_queue">("questions");
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [examCount, setExamCount] = useState<number>(0);
  const [examsList, setExamsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [selectedExamForModal, setSelectedExamForModal] = useState<any | null>(null);
  const [startingSession, setStartingSession] = useState<boolean>(false);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [qData, eData] = await Promise.all([listQuestions(), listExams()]);
        setQuestionCount(qData.length);
        setExamCount(eData.length);
        setExamsList(eData);
      } catch (err) {
        setExamsList([
          { id: 1, title: "Computer Science Midterm", duration_minutes: 30, subject: "Computer Science", question_count: 10 },
          { id: 2, title: "Operating Systems & Networking", duration_minutes: 45, subject: "Computer Science", question_count: 15 },
        ]);
      }
    }
    fetchStats();
  }, []);

  const loadAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await listUsers();
      setUsersList(data);
    } catch (err) {
      setUsersList([
        { id: 1, name: "John Student", email: "student@example.com", role: "student", is_approved: true },
        { id: 2, name: "Jane Examiner", email: "examiner@example.com", role: "examiner", is_approved: true },
        { id: 3, name: "Pending Candidate", email: "pending@example.com", role: "student", is_approved: false },
      ]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleToggleApproval = async (userId: number, currentStatus: boolean) => {
    try {
      await approveUser(userId, !currentStatus);
      loadAllUsers();
    } catch (err: any) {
      alert(err.message || "Failed to update user approval status.");
    }
  };

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

      const sessionData = await startExamSession(selectedExamForModal.id);
      const targetSessionId = sessionData.session_id || `session-${selectedExamForModal.id}`;

      if (sessionData.questions) {
        localStorage.setItem(`session_questions_${targetSessionId}`, JSON.stringify(sessionData.questions));
      }

      setSelectedExamForModal(null);
      router.push(`/exam/${targetSessionId}`);
    } catch (err: any) {
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
        const isAdmin = user.role === "admin";
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
                <div className="metric-icon" style={{ background: "rgba(6, 182, 212, 0.15)", color: "#38bdf8" }}>📚</div>
                <div>
                  <div className="metric-value">{questionCount}</div>
                  <div className="metric-label">Question Bank Items</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>📝</div>
                <div>
                  <div className="metric-value">{examCount}</div>
                  <div className="metric-label">Configured Exams</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon" style={{ background: "rgba(139, 92, 246, 0.15)", color: "#c084fc" }}>🎓</div>
                <div>
                  <div className="metric-value">Active</div>
                  <div className="metric-label">System Status</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24" }}>🛡️</div>
                <div>
                  <div className="metric-value" style={{ fontSize: "1.1rem", color: "#fbbf24" }}>MediaPipe</div>
                  <div className="metric-label">AI Proctor Engine</div>
                </div>
              </div>
            </div>

            {/* Segment Control Pill Bar for Examiners & Admins */}
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
                  className={`segment-item ${activeTab === "review_queue" ? "active" : ""}`}
                  onClick={() => setActiveTab("review_queue")}
                >
                  🛡️ Review Queue
                </button>
                {isAdmin && (
                  <button
                    className={`segment-item ${activeTab === "approvals" ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab("approvals");
                      loadAllUsers();
                    }}
                  >
                    👥 User Approval Management
                  </button>
                )}
              </div>
            )}

            {/* Main Panel View */}
            {isExaminerOrAdmin ? (
              <>
                {activeTab === "questions" && <QuestionBankManager />}
                {activeTab === "exams" && <ExamManager />}
                {activeTab === "review_queue" && <HybridReviewQueue />}
                {activeTab === "approvals" && isAdmin && (
                  <div className="panel-card">
                    <div className="panel-header">
                      <h3 className="panel-title">👥 User Approval & Access Control</h3>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: "0.45rem 1rem", fontSize: "0.82rem", width: "auto" }}
                        onClick={loadAllUsers}
                      >
                        🔄 Refresh User List
                      </button>
                    </div>

                    <p style={{ color: "var(--text-muted)", marginBottom: "1.25rem", fontSize: "0.88rem" }}>
                      As an Administrator, you can approve or revoke login access for registered Students and Examiners.
                    </p>

                    {loadingUsers ? (
                      <p style={{ color: "var(--text-muted)" }}>Loading users...</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                        {usersList.map((u) => (
                          <div
                            key={u.id}
                            style={{
                              padding: "1rem 1.25rem",
                              background: u.is_approved ? "rgba(15, 23, 42, 0.6)" : "rgba(245, 158, 11, 0.08)",
                              border: `1px solid ${u.is_approved ? "var(--border-subtle)" : "rgba(245, 158, 11, 0.3)"}`,
                              borderRadius: "12px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span className={getBadgeClass(u.role)}>{u.role}</span>
                                <span className={`badge ${u.is_approved ? "badge-examiner" : "badge-admin"}`}>
                                  {u.is_approved ? "🟢 APPROVED" : "🟡 PENDING APPROVAL"}
                                </span>
                              </div>
                              <h4 style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", marginTop: "0.3rem" }}>{u.name}</h4>
                              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{u.email}</p>
                            </div>

                            <div>
                              {u.role === "admin" ? (
                                <span className="badge badge-admin">Super Admin</span>
                              ) : (
                                <button
                                  type="button"
                                  className={`btn ${u.is_approved ? "btn-danger" : "btn-primary"}`}
                                  style={{ padding: "0.55rem 1.1rem", fontSize: "0.82rem", width: "auto" }}
                                  onClick={() => handleToggleApproval(Number(u.id), !!u.is_approved)}
                                >
                                  {u.is_approved ? "⛔ Revoke Access" : "✅ Approve User Access"}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                <p style={{ color: "var(--text-muted)", marginBottom: "1.25rem", fontSize: "0.88rem" }}>
                  Below are the examination papers configured by Examiners. Select a scheduled paper to start your proctored exam session.
                </p>

                {examsList.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", background: "rgba(15, 23, 42, 0.5)", borderRadius: "12px", border: "1px dashed var(--border-subtle)" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No exams configured yet by Examiners.</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    {examsList.map((ex) => (
                      <div key={ex.id} style={{
                        padding: "1.5rem",
                        background: "rgba(15, 23, 42, 0.65)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "14px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "1.25rem",
                        backdropFilter: "blur(12px)",
                        boxShadow: "var(--shadow-sm)"
                      }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                            <span className="badge badge-examiner">{ex.subject || "General"}</span>
                            <span className="badge badge-student">⏱ {ex.duration_minutes || ex.duration || 30} Mins</span>
                          </div>
                          <h4 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>{ex.title}</h4>
                          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                            Total Questions: <strong style={{ color: "var(--primary-cyan)" }}>{ex.question_count || ex.questions || 5}</strong> | Fullscreen Lock & MediaPipe Enabled
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
