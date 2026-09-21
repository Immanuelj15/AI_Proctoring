"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import ImageAnswerUpload from "@/components/exam/ImageAnswerUpload";
import IdentityVerificationModal from "@/components/exam/IdentityVerificationModal";
import { useProctoring } from "@/hooks/useProctoring";
import { API_BASE_URL, resumeExamSession, periodicFaceCheck } from "@/lib/api";
import { MotionPage, LivePulse, Button, AnimatedModal } from "@/components/motion";

export interface Question {
  id: string;
  orderIndex: number;
  subject: string;
  type: "MCQ" | "MULTI_SELECT" | "SHORT_ANSWER" | "LONG_ANSWER" | "IMAGE_UPLOAD";
  content: string;
  marks: number;
  negativeMarks: number;
  options?: { id: number; option_text: string }[];
}

export default function SecureExamRoomPage() {
  const router = useRouter();
  const routeParams = useParams();
  const sessionId = Array.isArray(routeParams?.sessionId)
    ? routeParams.sessionId[0]
    : (routeParams?.sessionId as string) || "1";
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(45 * 60);
  const [warningModalMessage, setWarningModalMessage] = useState<string | null>(null);
  const [isDisqualified, setIsDisqualified] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [examTitle, setExamTitle] = useState<string>("Database Management Systems (DBMS) Comprehensive Assessment");

  // Phase 1: Identity & Room Scan Onboarding State
  const [showIdentityModal, setShowIdentityModal] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isRoomScanned, setIsRoomScanned] = useState<boolean>(false);
  const lastPeriodicCheckRef = useRef<number>(Date.now());

  const [candidateInfo, setCandidateInfo] = useState({
    name: "Candidate Student",
    email: "student@example.com",
    phone: "+1 (555) 019-2831"
  });

  const defaultSampleQuestions: Question[] = [
    {
      id: "1",
      orderIndex: 1,
      subject: "Database Management Systems",
      type: "MCQ",
      content: "Which of the following ACID properties ensures that concurrent execution of transactions leaves the database in the same state as if the transactions were executed serially without interference?",
      marks: 2.0,
      negativeMarks: 0.5,
      options: [
        { id: 1, option_text: "Atomicity" },
        { id: 2, option_text: "Consistency" },
        { id: 3, option_text: "Isolation" },
        { id: 4, option_text: "Durability" },
      ],
    },
    {
      id: "2",
      orderIndex: 2,
      subject: "Database Management Systems",
      type: "MCQ",
      content: "In Relational Database normalization, a relation is in Boyce-Codd Normal Form (BCNF) if and only if for every non-trivial functional dependency X -> Y:",
      marks: 2.0,
      negativeMarks: 0.5,
      options: [
        { id: 5, option_text: "X is a Superkey" },
        { id: 6, option_text: "Y is a Prime Attribute" },
        { id: 7, option_text: "X is a Candidate Key and Y is not prime" },
        { id: 8, option_text: "Every non-prime attribute is fully functionally dependent on the primary key" },
      ],
    },
    {
      id: "3",
      orderIndex: 3,
      subject: "Database Management Systems",
      type: "MULTI_SELECT",
      content: "Which of the following SQL statements belong to the Data Definition Language (DDL)? (Select all that apply)",
      marks: 3.0,
      negativeMarks: 0.0,
      options: [
        { id: 9, option_text: "CREATE TABLE" },
        { id: 10, option_text: "ALTER TABLE" },
        { id: 11, option_text: "DROP INDEX" },
        { id: 12, option_text: "SELECT * FROM employees" },
        { id: 13, option_text: "UPDATE users SET status = 'active'" },
      ],
    },
    {
      id: "4",
      orderIndex: 4,
      subject: "Database Management Systems",
      type: "SHORT_ANSWER",
      content: "Explain the difference between a Primary Key and a Unique Key in relational database management systems.",
      marks: 5.0,
      negativeMarks: 0.0,
    },
    {
      id: "5",
      orderIndex: 5,
      subject: "Database Management Systems",
      type: "LONG_ANSWER",
      content: "Describe the Three Classic Concurrency Anomalies in database transactions: Dirty Read, Non-Repeatable Read, and Phantom Read. Explain how Transaction Isolation Levels prevent each anomaly.",
      marks: 10.0,
      negativeMarks: 0.0,
    },
    {
      id: "6",
      orderIndex: 6,
      subject: "Database Management Systems",
      type: "IMAGE_UPLOAD",
      content: "Draw an Entity-Relationship (ER) Diagram on paper for a University Course Registration System with Entities: Student, Course, Instructor, and Department. Indicate Primary Keys, Foreign Keys, and Cardinalities (1:1, 1:N, M:N). Upload a clear photo or scan of your handwritten diagram.",
      marks: 10.0,
      negativeMarks: 0.0,
    }
  ];

  const [questions, setQuestions] = useState<Question[]>(defaultSampleQuestions);

  const { metrics, wsConnected, videoRef, canvasRef } = useProctoring({
    sessionId: sessionId,
    onViolation: (type, inc) => {
      setWarningModalMessage(`Proctoring Incident: '${type}' detected. Cumulative Suspicion +${inc}`);
    },
    onDisqualify: () => {
      setIsDisqualified(true);
      setWarningModalMessage("SESSION TERMINATED: Maximum suspicion threshold exceeded (100/100). The exam session has been disqualified for academic integrity violations.");
    }
  });

  // Crash-Safe Resume: Load session details, deterministically ordered questions & restored answers
  useEffect(() => {
    async function initSession() {
      try {
        const resumeData = await resumeExamSession(sessionId);
        if (resumeData) {
          if (resumeData.exam_title) {
            setExamTitle(resumeData.exam_title);
          }
          if (resumeData.time_remaining_seconds !== undefined) {
            setSecondsRemaining(resumeData.time_remaining_seconds);
          }
          if (Array.isArray(resumeData.questions) && resumeData.questions.length > 0) {
            setQuestions(resumeData.questions);
          }
          if (resumeData.answers) {
            const restoredAnswers: Record<string, any> = {};
            for (const [qid, a] of Object.entries(resumeData.answers as Record<string, any>)) {
              if (a.selected_option_id !== null && a.selected_option_id !== undefined) {
                restoredAnswers[qid] = a.selected_option_id;
              } else if (a.answer_text) {
                if (a.answer_text.includes(",")) {
                  const parts = a.answer_text.split(",").map((n: string) => parseInt(n.trim(), 10)).filter((n: number) => !isNaN(n));
                  restoredAnswers[qid] = parts.length > 0 ? parts : a.answer_text;
                } else {
                  restoredAnswers[qid] = a.answer_text;
                }
              } else if (a.image_path) {
                restoredAnswers[qid] = a.image_path;
              }
            }
            setAnswers(restoredAnswers);
          }

          // Check Phase 1 Onboarding: Identity & Room Scan
          if (!resumeData.identity_verified || !resumeData.room_scan_completed) {
            setShowIdentityModal(true);
          } else {
            setIsVerified(true);
            setIsRoomScanned(true);
          }
          return;
        }
      } catch (err) {
        // Fallback: Check local storage cache if offline
        try {
          const stored = localStorage.getItem(`session_questions_${sessionId}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setQuestions(parsed);
            }
          }
        } catch (e) {}
      }
    }

    initSession();
  }, [sessionId]);

  // Periodic background face-check during active exam
  useEffect(() => {
    if (!isVerified || showIdentityModal || isDisqualified) return;

    const interval = setInterval(async () => {
      try {
        if (videoRef.current) {
          const canvas = document.createElement("canvas");
          canvas.width = videoRef.current.videoWidth || 640;
          canvas.height = videoRef.current.videoHeight || 480;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.75));
            if (blob) {
              const formData = new FormData();
              formData.append("live_frame", blob, "periodic_frame.jpg");
              await periodicFaceCheck(sessionId, formData);
            }
          }
        }
      } catch (e) {}
    }, 180000); // Check every 3 minutes

    return () => clearInterval(interval);
  }, [sessionId, isVerified, showIdentityModal, isDisqualified, videoRef]);

  // Fetch logged in candidate details
  useEffect(() => {
    try {
      const userRaw = localStorage.getItem("user");
      if (userRaw) {
        const u = JSON.parse(userRaw);
        setCandidateInfo({
          name: u.name || "Candidate Student",
          email: u.email || "student@example.com",
          phone: u.phone_number || "+1 (555) 019-2831"
        });
      }
    } catch (err) {}
  }, []);

  // Zero-Trust Anti-Cheat Lockout Event Listeners
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleCopyPaste = (e: ClipboardEvent) => e.preventDefault();
    const handleSelectStart = (e: Event) => e.preventDefault();

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isDisqualified) {
        setWarningModalMessage("CRITICAL VIOLATION: Fullscreen mode exited! Re-enter fullscreen or this session will be recorded as a non-compliant attempt.");
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isDisqualified]);

  // Server-side remaining time sync & countdown
  useEffect(() => {
    async function syncTime() {
      try {
        const token = localStorage.getItem("auth_token");
        const numSessId = parseInt(sessionId, 10);
        if (!isNaN(numSessId)) {
          const res = await fetch(`${API_BASE_URL}/exam-sessions/${numSessId}/time-remaining`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.time_remaining_seconds !== undefined) {
              setSecondsRemaining(data.time_remaining_seconds);
            }
          }
        }
      } catch (e) {}
    }
    syncTime();
  }, [sessionId]);

  const handleSubmitExam = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      const token = localStorage.getItem("auth_token");
      const numSessId = parseInt(sessionId, 10);
      if (!isNaN(numSessId)) {
        await fetch(`${API_BASE_URL}/exam-sessions/${numSessId}/submit`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
      }
    } catch (err) {}
    router.push(`/results/${sessionId}`);
  }, [sessionId, submitting, router]);

  // Timer Tick (only ticks when onboarding modal is not active)
  useEffect(() => {
    if (showIdentityModal) return;
    if (secondsRemaining <= 0) {
      handleSubmitExam();
      return;
    }
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining, handleSubmitExam, showIdentityModal]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const reEnterFullscreen = () => {
    setWarningModalMessage(null);
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const saveAnswerToBackend = async (qId: string, answerPayload: any) => {
    try {
      const token = localStorage.getItem("auth_token");
      const numSessId = parseInt(sessionId, 10);
      const numQId = parseInt(qId, 10);
      if (isNaN(numSessId) || isNaN(numQId)) return;

      const body: any = { question_id: numQId };
      if (typeof answerPayload === "number") {
        body.selected_option_id = answerPayload;
      } else if (Array.isArray(answerPayload)) {
        body.answer_text = answerPayload.join(",");
      } else if (typeof answerPayload === "string") {
        body.answer_text = answerPayload;
      }

      await fetch(`${API_BASE_URL}/exam-sessions/${numSessId}/answers`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
    } catch (err) {}
  };

  const currentQ = questions[currentQuestionIndex] || questions[0];

  const handleOptionSelect = (qId: string, optionId: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: optionId }));
    saveAnswerToBackend(qId, optionId);
  };

  const handleMultiSelectToggle = (qId: string, optionId: number) => {
    const current = (answers[qId] as number[]) || [];
    const updated = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];
    setAnswers((prev) => ({ ...prev, [qId]: updated }));
    saveAnswerToBackend(qId, updated);
  };

  const handleTextChange = (qId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: text }));
    saveAnswerToBackend(qId, text);
  };

  const handleImageSelected = (qId: string, base64: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: base64 }));
    saveAnswerToBackend(qId, base64);
  };

  const toggleFlagQuestion = (qId: string) => {
    setFlaggedQuestions((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  // Timer Color Calculation
  const isTimerCritical = secondsRemaining < 60;
  const isTimerWarning = secondsRemaining < 300;
  const timerColor = isTimerCritical ? "#ef4444" : isTimerWarning ? "#f59e0b" : "#38bdf8";

  // Palette Status Counts
  const answeredCount = Object.keys(answers).filter((k) => answers[k] !== undefined && answers[k] !== "").length;
  const flaggedCount = Object.values(flaggedQuestions).filter(Boolean).length;

  return (
    <MotionPage style={{ width: "100%", height: "100%" }}>
      <div style={{ width: "100%", userSelect: "none", height: "calc(100vh - 72px)", display: "flex", flexDirection: "column" }}>
        {/* Warning & Disqualification Modal with AnimatedModal */}
        <AnimatedModal
          isOpen={!!warningModalMessage}
          onClose={() => { if (!isDisqualified) reEnterFullscreen(); }}
          maxWidth="480px"
        >
          {warningModalMessage && (
            <div className="hud-modal-content" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>
                {isDisqualified ? "🚨" : "⚠️"}
              </div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: isDisqualified ? "#ef4444" : "#f59e0b", marginBottom: "0.5rem" }}>
                {isDisqualified ? "Session Disqualified" : "Proctoring Integrity Warning"}
              </h3>
              <p style={{ fontSize: "0.92rem", color: "var(--text-secondary)", marginBottom: "1.75rem", lineHeight: 1.6 }}>
                {warningModalMessage}
              </p>
              {isDisqualified ? (
                <Button
                  variant="danger"
                  style={{ width: "100%", padding: "0.85rem" }}
                  onClick={() => router.push(`/results/${sessionId}`)}
                >
                  Exit to Results Summary
                </Button>
              ) : (
                <Button
                  variant="primary"
                  style={{ width: "100%", padding: "0.85rem" }}
                  onClick={reEnterFullscreen}
                >
                  🔒 Re-Enter Fullscreen & Continue Exam
                </Button>
              )}
            </div>
          )}
        </AnimatedModal>

      {/* Top Exam Header Banner */}
      <div style={{
        padding: "0.75rem 1.5rem",
        background: "rgba(15, 23, 42, 0.75)",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="telemetry-pill pill-ai">{currentQ?.subject || "DBMS"}</span>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Session #{sessionId}</span>
            </div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff", marginTop: "0.15rem" }}>
              {examTitle}
            </h2>
          </div>
        </div>

        {/* Center Countdown Timer */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          background: "rgba(0, 0, 0, 0.5)",
          padding: "0.45rem 1.25rem",
          borderRadius: "var(--radius-full)",
          border: `1px solid ${timerColor}`,
          boxShadow: `0 0 15px ${timerColor}33`
        }}>
          <span style={{ fontSize: "1rem" }}>⏱</span>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: "1.3rem",
            fontWeight: 800,
            color: timerColor,
            animation: isTimerCritical ? "pulseGlow 1s infinite" : "none"
          }}>
            {formatTimer(secondsRemaining)}
          </span>
        </div>

        {/* Right Candidate Strip & Submit Action */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>{candidateInfo.name}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{candidateInfo.email}</div>
          </div>
          <Button
            onClick={handleSubmitExam}
            disabled={submitting}
            isLoading={submitting}
            variant="primary"
            style={{ padding: "0.55rem 1.25rem", fontSize: "0.85rem" }}
          >
            Submit Exam Paper
          </Button>
        </div>
      </div>

      {/* Main 3-Column Layout Grid */}
      <div className="exam-layout-grid" style={{ flex: 1, padding: "1rem 1.5rem" }}>
        {/* ========================================================
            COLUMN 1: QUESTION PALETTE SIDEBAR
            ======================================================== */}
        <aside className="question-palette-panel">
          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#fff", marginBottom: "0.25rem" }}>
              Question Palette
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {questions.length} Questions Total
            </p>
          </div>

          {/* Palette Status Summary Counters */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
            <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "0.4rem 0.6rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
              <div style={{ fontSize: "0.68rem", color: "#34d399", fontWeight: 700 }}>ANSWERED</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#34d399" }}>{answeredCount}</div>
            </div>
            <div style={{ background: "rgba(245, 158, 11, 0.1)", padding: "0.4rem 0.6rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
              <div style={{ fontSize: "0.68rem", color: "#fbbf24", fontWeight: 700 }}>FLAGGED</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fbbf24" }}>{flaggedCount}</div>
            </div>
          </div>

          {/* Questions Grid Buttons */}
          <div className="palette-grid">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentQuestionIndex;
              const isAnswered = answers[q.id] !== undefined && answers[q.id] !== "";
              const isFlagged = flaggedQuestions[q.id];

              let btnClass = "palette-btn-unvisited";
              if (isCurrent) {
                btnClass = "palette-btn-current";
              } else if (isFlagged) {
                btnClass = "palette-btn-flagged";
              } else if (isAnswered) {
                btnClass = "palette-btn-answered";
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`palette-btn ${btnClass}`}
                >
                  {idx + 1}
                  {isFlagged && <span style={{ fontSize: "0.6rem", position: "absolute", top: "2px", right: "4px" }}>🚩</span>}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ marginTop: "auto", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.85rem", fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }} />
              <span>Current Active Question</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "rgba(16, 185, 129, 0.4)", border: "1px solid #10b981" }} />
              <span>Answered & Saved</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "rgba(245, 158, 11, 0.4)", border: "1px solid #f59e0b" }} />
              <span>Marked for Review</span>
            </div>
          </div>
        </aside>

        {/* ========================================================
            COLUMN 2: MAIN QUESTION WORKSPACE
            ======================================================== */}
        <main className="exam-workspace">
          {/* Workspace Header */}
          <div className="exam-workspace-header">
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span className="telemetry-pill pill-ai font-mono">Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span className="telemetry-pill pill-neutral">{currentQ.type}</span>
              <span style={{ fontSize: "0.8rem", color: "var(--accent-emerald)", fontWeight: 700 }}>
                +{currentQ.marks} Marks
              </span>
              {currentQ.negativeMarks > 0 && (
                <span style={{ fontSize: "0.8rem", color: "var(--accent-rose)", fontWeight: 700 }}>
                  -{currentQ.negativeMarks} Negative
                </span>
              )}
            </div>

            <button
              onClick={() => toggleFlagQuestion(currentQ.id)}
              className="btn-ghost"
              style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem", borderRadius: "var(--radius-sm)", color: flaggedQuestions[currentQ.id] ? "#fbbf24" : "var(--text-muted)" }}
            >
              {flaggedQuestions[currentQ.id] ? "🚩 Flagged for Review" : "🏳️ Flag Question"}
            </button>
          </div>

          {/* Question Body */}
          <div className="exam-workspace-body">
            <div style={{ fontSize: "1.15rem", fontWeight: 600, color: "#fff", lineHeight: 1.6, marginBottom: "2rem" }}>
              {currentQ.content}
            </div>

            {/* Answer Input Widgets Based on Question Type */}

            {/* 1. MCQ Radio Options */}
            {currentQ.type === "MCQ" && currentQ.options && (
              <div>
                {currentQ.options.map((opt) => {
                  const isSelected = answers[currentQ.id] === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleOptionSelect(currentQ.id, opt.id)}
                      className={`option-card-label ${isSelected ? "option-card-selected" : ""}`}
                    >
                      <div className="custom-radio-circle">
                        {isSelected && <div className="custom-radio-inner" />}
                      </div>
                      <span style={{ fontSize: "0.95rem", color: isSelected ? "#fff" : "var(--text-secondary)", fontWeight: isSelected ? 600 : 400 }}>
                        {opt.option_text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. MULTI_SELECT Checkboxes */}
            {currentQ.type === "MULTI_SELECT" && currentQ.options && (
              <div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                  💡 Select all options that apply:
                </p>
                {currentQ.options.map((opt) => {
                  const selectedArr = (answers[currentQ.id] as number[]) || [];
                  const isChecked = selectedArr.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleMultiSelectToggle(currentQ.id, opt.id)}
                      className={`option-card-label ${isChecked ? "option-card-selected" : ""}`}
                    >
                      <div style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "4px",
                        border: isChecked ? "2px solid var(--primary-cyan)" : "2px solid var(--text-dim)",
                        background: isChecked ? "var(--primary-cyan)" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#000",
                        fontSize: "0.75rem",
                        fontWeight: 900
                      }}>
                        {isChecked && "✓"}
                      </div>
                      <span style={{ fontSize: "0.95rem", color: isChecked ? "#fff" : "var(--text-secondary)", fontWeight: isChecked ? 600 : 400 }}>
                        {opt.option_text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. SHORT_ANSWER Single Line / Small Textarea */}
            {currentQ.type === "SHORT_ANSWER" && (
              <div>
                <textarea
                  className="hud-textarea"
                  rows={4}
                  placeholder="Type your concise technical answer here..."
                  value={answers[currentQ.id] || ""}
                  onChange={(e) => handleTextChange(currentQ.id, e.target.value)}
                />
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem", textAlign: "right" }}>
                  {(answers[currentQ.id] || "").length} characters | Word Count: {(answers[currentQ.id] || "").trim().split(/\s+/).filter(Boolean).length}
                </div>
              </div>
            )}

            {/* 4. LONG_ANSWER Structured Essay Textarea */}
            {currentQ.type === "LONG_ANSWER" && (
              <div>
                <div style={{ fontSize: "0.8rem", color: "var(--primary-cyan)", marginBottom: "0.75rem", background: "rgba(6, 182, 212, 0.08)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(6, 182, 212, 0.2)" }}>
                  💡 Grading Rubric: Focus on key definitions, architectural distinctions, and real-world database anomaly scenarios.
                </div>
                <textarea
                  className="hud-textarea"
                  rows={9}
                  placeholder="Provide your in-depth technical explanation, breakdown, and concrete examples..."
                  value={answers[currentQ.id] || ""}
                  onChange={(e) => handleTextChange(currentQ.id, e.target.value)}
                />
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem", textAlign: "right" }}>
                  Word Count: {(answers[currentQ.id] || "").trim().split(/\s+/).filter(Boolean).length} words
                </div>
              </div>
            )}

            {/* 5. IMAGE_UPLOAD Handwritten ER Diagram / Calculation */}
            {currentQ.type === "IMAGE_UPLOAD" && (
              <div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                  📷 Draw your diagram on paper. Capture it with your webcam or upload a clear photo/scan.
                  Tesseract OCR will automatically extract handwritten text for examiner audit.
                </div>
                <ImageAnswerUpload
                  currentImage={answers[currentQ.id]}
                  onImageSelected={(base64) => handleImageSelected(currentQ.id, base64)}
                />
              </div>
            )}
          </div>

          {/* Workspace Footer Navigation */}
          <div className="exam-workspace-footer">
            <button
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="btn-ghost"
              style={{ opacity: currentQuestionIndex === 0 ? 0.4 : 1 }}
            >
              ← Previous
            </button>

            <div style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>
              {answers[currentQ.id] ? "✓ Answer Saved" : "○ Unanswered"}
            </div>

            {currentQuestionIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="btn-primary"
              >
                Next Question →
              </button>
            ) : (
              <button
                onClick={handleSubmitExam}
                disabled={submitting}
                className="btn-emerald"
              >
                {submitting ? "Finalizing..." : "Review & Submit Exam"}
              </button>
            )}
          </div>
        </main>

        {/* ========================================================
            COLUMN 3: BIOMETRIC PROCTORING COMMAND HUD
            ======================================================== */}
        <aside className="proctor-hud-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="pulse-dot pulse-dot-green" />
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#fff", textTransform: "uppercase" }}>
                AI Vision Proctor
              </span>
            </div>
            <span className="telemetry-pill pill-active font-mono" style={{ fontSize: "0.68rem" }}>
              {wsConnected ? "STREAM ACTIVE" : "CONNECTING..."}
            </span>
          </div>

          {/* Webcam Viewport with Scanner HUD Reticles */}
          <div className="webcam-hud-box">
            <video ref={videoRef} autoPlay playsInline muted className="webcam-video-feed" />
            <canvas ref={canvasRef} style={{ display: "none" }} />

            <div className="webcam-hud-overlay">
              {/* Corner Reticles */}
              <div className="scanner-corner corner-tl" />
              <div className="scanner-corner corner-tr" />
              <div className="scanner-corner corner-bl" />
              <div className="scanner-corner corner-br" />

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ background: "rgba(0,0,0,0.7)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.65rem", color: "#38bdf8", fontFamily: "var(--font-mono)" }}>
                  FACE TRACK: ACTIVE
                </span>
                <span style={{ background: "rgba(0,0,0,0.7)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.65rem", color: "#34d399", fontFamily: "var(--font-mono)" }}>
                  30 FPS
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <span style={{ background: "rgba(0,0,0,0.7)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.65rem", color: "#fbbf24", fontFamily: "var(--font-mono)" }}>
                  GAZE: CENTER
                </span>
                <div className="audio-spectrum-container">
                  <div className="audio-bar-stick" style={{ height: "6px" }} />
                  <div className="audio-bar-stick" style={{ height: "14px" }} />
                  <div className="audio-bar-stick" style={{ height: "9px" }} />
                  <div className="audio-bar-stick" style={{ height: "18px" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Telemetry Metrics Breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.65rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Tab Switch Policy:</span>
              <span className="strike-badge-box font-mono" style={{ padding: "0.2rem 0.5rem" }}>
                0 / 3 Strikes
              </span>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.65rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Suspicion Index:</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#34d399" }}>
                0.0 / 100 (Safe)
              </span>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.65rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Zero-Trust Lockdown:</span>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#38bdf8" }}>
                ENFORCED
              </span>
            </div>
          </div>

          {/* Compliance Notice */}
          <div style={{ marginTop: "auto", background: "rgba(6, 182, 212, 0.05)", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(6, 182, 212, 0.2)", fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            🛡️ Audio, video, and browser focus are continuously audited. Examiner intervention can occur live at any moment.
          </div>
        </aside>
      </div>

      {/* Phase 1 Pre-Exam Identity Verification & Room Scan Modal */}
      {showIdentityModal && (
        <IdentityVerificationModal
          sessionId={sessionId}
          candidateName={candidateInfo.name}
          examTitle={examTitle}
          onComplete={() => {
            setShowIdentityModal(false);
            setIsVerified(true);
            setIsRoomScanned(true);
            if (document.documentElement.requestFullscreen) {
              document.documentElement.requestFullscreen().catch(() => {});
            }
          }}
          onCancel={() => router.push("/dashboard")}
        />
      )}
    </div>
  </MotionPage>
  );
}
