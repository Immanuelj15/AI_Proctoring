"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ImageAnswerUpload from "@/components/exam/ImageAnswerUpload";
import { useProctoring } from "@/hooks/useProctoring";

export interface Question {
  id: string;
  orderIndex: number;
  subject: string;
  type: "MCQ" | "MULTI_SELECT" | "SHORT_ANSWER" | "LONG_ANSWER" | "IMAGE_UPLOAD";
  content: string;
  marks: number;
  negativeMarks: number;
  options?: { id: string; option_text: string }[];
}

export default function SecureExamRoomPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30 * 60);
  const [warningModalMessage, setWarningModalMessage] = useState<string | null>(null);
  const [candidateInfo, setCandidateInfo] = useState({
    name: "John Student",
    email: "student@example.com",
    phone: "+1 (555) 019-2831"
  });

  const sampleQuestions: Question[] = [
    {
      id: "q-101",
      orderIndex: 1,
      subject: "Computer Science",
      type: "MCQ",
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
      id: "q-102",
      orderIndex: 2,
      subject: "Computer Science",
      type: "SHORT_ANSWER",
      content: "Explain the difference between process and thread in operating systems.",
      marks: 5.0,
      negativeMarks: 0.0,
    },
    {
      id: "q-103",
      orderIndex: 3,
      subject: "Mathematics",
      type: "IMAGE_UPLOAD",
      content: "Upload handwritten calculation step for derivative of f(x) = x^3 + 2x.",
      marks: 10.0,
      negativeMarks: 0.0,
    }
  ];

  const { metrics, wsConnected, videoRef, canvasRef } = useProctoring({
    sessionId: params.sessionId,
    onViolation: (type, inc) => {
      setWarningModalMessage(`Proctoring Warning: Event '${type}' detected. Suspicion Index +${inc}`);
    },
  });

  // Fetch logged in candidate details
  useEffect(() => {
    try {
      const userRaw = localStorage.getItem("user");
      if (userRaw) {
        const u = JSON.parse(userRaw);
        setCandidateInfo({
          name: u.name || "John Student",
          email: u.email || "student@example.com",
          phone: u.phone_number || "+1 (555) 019-2831"
        });
      }
    } catch (err) {}
  }, []);

  // Anti-Cheat Lockout Event Listeners & Fullscreen Enforcement
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleCopyPaste = (e: ClipboardEvent) => e.preventDefault();
    const handleSelectStart = (e: Event) => e.preventDefault();

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setWarningModalMessage("CRITICAL VIOLATION: Fullscreen mode exited! Re-enter fullscreen or your session will be auto-terminated.");
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
  }, []);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const reEnterFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    setWarningModalMessage(null);
  };

  const handleSubmitExam = async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      const token = localStorage.getItem("auth_token");
      await fetch(`http://127.0.0.1:8000/exam-sessions/${params.sessionId}/submit`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
    } catch (err) {}
    router.push(`/results/${params.sessionId}`);
  };

  const currentQ = sampleQuestions[currentQuestionIndex];

  const handleOptionSelect = (qId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: optionId }));
  };

  const handleTextChange = (qId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: text }));
  };

  const handleImageSelected = (qId: string, base64: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: base64 }));
  };

  const timerColorClass =
    secondsRemaining < 60
      ? "timer-red"
      : secondsRemaining < 300
      ? "timer-amber"
      : "timer-normal";

  return (
    <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto", userSelect: "none" }}>
      {/* Warning Modal */}
      {warningModalMessage && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.88)",
          backdropFilter: "blur(12px)",
          zIndex: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem"
        }}>
          <div style={{ background: "#ffffff", padding: "2rem", borderRadius: "16px", maxWidth: "460px", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⚠️</div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#dc2626", marginBottom: "0.5rem" }}>
              Proctoring Violation Warning
            </h3>
            <p style={{ fontSize: "0.9rem", color: "#475569", marginBottom: "1.5rem", lineHeight: 1.5 }}>
              {warningModalMessage}
            </p>
            <button className="btn btn-primary" onClick={reEnterFullscreen}>
              🔒 Re-Enter Fullscreen & Continue
            </button>
          </div>
        </div>
      )}

      {/* Candidate Metadata Banner & Top Header */}
      <header className="app-header" style={{ marginBottom: "1.25rem", borderRadius: "14px", flexDirection: "column", alignItems: "stretch", gap: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="badge badge-student" style={{ fontSize: "0.75rem", marginBottom: "0.2rem" }}>
              Exam Paper: Computer Science Midterm
            </span>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>Candidate: {candidateInfo.name}</h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div className={`countdown-timer ${timerColorClass}`} style={{ fontSize: "1.25rem", fontWeight: 800 }}>
              ⏱ {formatTimer(secondsRemaining)}
            </div>
            <button className="btn btn-primary" onClick={handleSubmitExam} style={{ width: "auto" }}>
              Submit Exam Paper
            </button>
          </div>
        </div>

        {/* Candidate Identity Details Strip */}
        <div style={{
          display: "flex",
          gap: "1.5rem",
          padding: "0.5rem 0.85rem",
          background: "#f8fafc",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          fontSize: "0.82rem",
          color: "#334155"
        }}>
          <div>📧 Email: <strong>{candidateInfo.email}</strong></div>
          <div>📞 Phone Number: <strong>{candidateInfo.phone}</strong></div>
          <div>🛡️ Status: <strong style={{ color: "#16a34a" }}>Proctored Fullscreen Live</strong></div>
        </div>
      </header>

      {/* Two-Pane Main Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem" }}>
        {/* Left Pane: Question Prompt & Answer Area */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="panel-card">
            <div className="panel-header">
              <span className="badge badge-student">Question {currentQuestionIndex + 1} of {sampleQuestions.length}</span>
              <span className="badge badge-admin">+{currentQ.marks} Marks ({currentQ.negativeMarks} Neg)</span>
            </div>

            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", marginBottom: "1.5rem", lineHeight: 1.5 }}>
              {currentQ.content}
            </h3>

            {/* MCQ Selector */}
            {currentQ.type === "MCQ" && currentQ.options && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {currentQ.options.map((opt) => (
                  <label
                    key={opt.id}
                    className="option-card"
                    style={{ cursor: "pointer", background: answers[currentQ.id] === opt.id ? "#eff6ff" : "#ffffff", borderColor: answers[currentQ.id] === opt.id ? "#2563eb" : "#cbd5e1" }}
                  >
                    <input
                      type="radio"
                      name={`mcq-${currentQ.id}`}
                      checked={answers[currentQ.id] === opt.id}
                      onChange={() => handleOptionSelect(currentQ.id, opt.id)}
                      style={{ width: "18px", height: "18px", accentColor: "#2563eb" }}
                    />
                    <span style={{ fontSize: "0.92rem", fontWeight: answers[currentQ.id] === opt.id ? 700 : 400 }}>
                      {opt.option_text}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Short/Long Answer Editor */}
            {(currentQ.type === "SHORT_ANSWER" || currentQ.type === "LONG_ANSWER") && (
              <div className="form-group">
                <textarea
                  className="form-textarea"
                  rows={6}
                  placeholder="Type your response here..."
                  value={answers[currentQ.id] || ""}
                  onChange={(e) => handleTextChange(currentQ.id, e.target.value)}
                />
                <div style={{ textAlign: "right", fontSize: "0.78rem", color: "#64748b", marginTop: "0.35rem" }}>
                  Word Count: {(answers[currentQ.id] || "").trim() ? (answers[currentQ.id] || "").trim().split(/\s+/).length : 0}
                </div>
              </div>
            )}

            {/* Handwritten Image Upload */}
            {currentQ.type === "IMAGE_UPLOAD" && (
              <ImageAnswerUpload
                onImageSelected={(base64) => handleImageSelected(currentQ.id, base64)}
                currentImage={answers[currentQ.id]}
              />
            )}
          </div>

          {/* Nav Controls */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button
              className="btn btn-primary"
              style={{ width: "auto", background: "#64748b" }}
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            >
              ← Previous Question
            </button>

            <button
              className="btn btn-primary"
              style={{ width: "auto" }}
              disabled={currentQuestionIndex === sampleQuestions.length - 1}
              onClick={() => setCurrentQuestionIndex((prev) => Math.min(sampleQuestions.length - 1, prev + 1))}
            >
              Next Question →
            </button>
          </div>
        </div>

        {/* Right Sidebar: Webcam & Question Palette */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Webcam Box */}
          <div className="panel-card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ position: "relative", width: "100%", height: "170px", background: "#0f172a", borderRadius: "10px", overflow: "hidden" }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
              <div style={{ position: "absolute", bottom: "8px", left: "8px", background: "rgba(15, 23, 42, 0.8)", color: "#ffffff", padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 700 }}>
                {metrics.suspicionScore > 50 ? "⚠️ High Risk" : "🛡️ AI Monitored"}
              </div>
            </div>
            <div style={{ marginTop: "0.6rem", fontSize: "0.82rem", color: "#64748b" }}>
              Suspicion Score: <strong style={{ color: metrics.suspicionScore > 50 ? "#dc2626" : "#2563eb" }}>{metrics.suspicionScore.toFixed(0)} / 100</strong>
            </div>
          </div>

          {/* Question Palette */}
          <div className="panel-card">
            <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.85rem" }}>Question Palette</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
              {sampleQuestions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isActive = idx === currentQuestionIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    style={{
                      padding: "0.6rem",
                      borderRadius: "8px",
                      border: isActive ? "2px solid #2563eb" : "1px solid #cbd5e1",
                      background: isActive ? "#2563eb" : isAnswered ? "#10b981" : "#ffffff",
                      color: isActive ? "#ffffff" : isAnswered ? "#ffffff" : "#0f172a",
                      fontWeight: 800,
                      cursor: "pointer"
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
