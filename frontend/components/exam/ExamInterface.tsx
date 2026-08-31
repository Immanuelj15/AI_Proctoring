"use client";

import React, { useState, useEffect } from "react";
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

export interface ExamInterfaceProps {
  sessionId: string;
  subjectName: string;
  durationMinutes: number;
  questions: Question[];
  onSubmitExam: (answers: Record<string, any>) => void;
}

export default function ExamInterface({
  sessionId,
  subjectName,
  durationMinutes,
  questions,
  onSubmitExam,
}: ExamInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(durationMinutes * 60);

  const { metrics, wsConnected, videoRef, canvasRef } = useProctoring({
    sessionId,
    onViolation: (type, inc) => {
      console.warn(`[Proctor Warning] ${type} +${inc} suspicion`);
    },
  });

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onSubmitExam(answers);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [answers, onSubmitExam]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentQ = questions[currentQuestionIndex] || questions[0];

  const handleOptionSelect = (qId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: [optionId],
    }));
  };

  const handleMultiSelect = (qId: string, optionId: string) => {
    setAnswers((prev) => {
      const currentList: string[] = prev[qId] || [];
      const updated = currentList.includes(optionId)
        ? currentList.filter((id) => id !== optionId)
        : [...currentList, optionId];
      return { ...prev, [qId]: updated };
    });
  };

  const handleTextChange = (qId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: text,
    }));
  };

  const toggleFlag = (qId: string) => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const timerColorClass =
    secondsRemaining < 60
      ? "timer-red"
      : secondsRemaining < 300
      ? "timer-amber"
      : "timer-normal";

  return (
    <div className="exam-container">
      {/* Top Header Bar */}
      <header className="exam-header">
        <div className="header-info">
          <h1 className="header-subject">{subjectName}</h1>
          <span className={`sync-badge ${wsConnected ? "online" : "offline"}`}>
            <span className="dot"></span>
            {wsConnected ? "Proctoring Live Sync" : "Syncing Reconnect..."}
          </span>
        </div>

        <div className={`countdown-timer ${timerColorClass}`}>
          ⏱ {formatTimer(secondsRemaining)}
        </div>

        <button className="btn-submit-exam" onClick={() => onSubmitExam(answers)}>
          Submit Exam
        </button>
      </header>

      {/* Main Two-Pane Area + Sidebar */}
      <div className="exam-layout">
        {/* Left Pane: Question Prompt */}
        <div className="question-pane">
          <div className="pane-header">
            <span className="question-num">Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span className="marks-badge">+{currentQ.marks} Marks ({currentQ.negativeMarks} Neg)</span>
          </div>

          <div className="question-body">
            <p className="question-text">{currentQ.content}</p>
          </div>

          <div className="pane-footer">
            <button
              className={`btn-flag ${flaggedQuestions[currentQ.id] ? "flagged" : ""}`}
              onClick={() => toggleFlag(currentQ.id)}
            >
              🚩 {flaggedQuestions[currentQ.id] ? "Flagged for Review" : "Flag for Review"}
            </button>
          </div>
        </div>

        {/* Right Pane: Answer Input Editor */}
        <div className="answer-pane">
          <h3 className="pane-title">Your Response ({currentQ.type})</h3>

          {currentQ.type === "MCQ" && currentQ.options && (
            <div className="options-group">
              {currentQ.options.map((opt) => (
                <label key={opt.id} className="option-card">
                  <input
                    type="radio"
                    name={`mcq-${currentQ.id}`}
                    checked={(answers[currentQ.id] || [])[0] === opt.id}
                    onChange={() => handleOptionSelect(currentQ.id, opt.id)}
                  />
                  <span>{opt.option_text}</span>
                </label>
              ))}
            </div>
          )}

          {currentQ.type === "MULTI_SELECT" && currentQ.options && (
            <div className="options-group">
              {currentQ.options.map((opt) => (
                <label key={opt.id} className="option-card">
                  <input
                    type="checkbox"
                    checked={(answers[currentQ.id] || []).includes(opt.id)}
                    onChange={() => handleMultiSelect(currentQ.id, opt.id)}
                  />
                  <span>{opt.option_text}</span>
                </label>
              ))}
            </div>
          )}

          {(currentQ.type === "SHORT_ANSWER" || currentQ.type === "LONG_ANSWER") && (
            <div className="editor-group">
              <textarea
                className="answer-textarea"
                rows={currentQ.type === "LONG_ANSWER" ? 10 : 4}
                placeholder="Type your structured answer here..."
                value={answers[currentQ.id] || ""}
                onChange={(e) => handleTextChange(currentQ.id, e.target.value)}
              />
              <div className="word-count">
                Words: {(answers[currentQ.id] || "").trim() ? (answers[currentQ.id] || "").trim().split(/\s+/).length : 0}
              </div>
            </div>
          )}

          {currentQ.type === "IMAGE_UPLOAD" && (
            <div className="dropzone">
              <p>📷 Drag & Drop handwritten response image or click to capture via webcam</p>
              <input type="file" accept="image/*" className="file-input" />
            </div>
          )}

          {/* Navigation Controls */}
          <div className="nav-controls">
            <button
              className="btn-nav"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            >
              ← Previous
            </button>
            <button
              className="btn-nav btn-next"
              disabled={currentQuestionIndex === questions.length - 1}
              onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Right Sidebar: Webcam & Question Palette */}
        <aside className="exam-sidebar">
          {/* Live Webcam & Proctor Status Overlay */}
          <div className="webcam-card">
            <div className="webcam-box">
              <video ref={videoRef} autoPlay playsInline muted className="webcam-video" />
              <canvas ref={canvasRef} className="webcam-canvas" />
              <div className="proctor-badge">
                {metrics.suspicionScore > 50 ? "⚠️ Warning" : "🛡️ Monitored"}
              </div>
            </div>
            <div className="metrics-summary">
              <small>Suspicion Index: <strong>{metrics.suspicionScore.toFixed(0)} / 100</strong></small>
            </div>
          </div>

          {/* Question Palette Grid */}
          <div className="palette-card">
            <h4>Question Palette</h4>
            <div className="palette-grid">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isFlagged = !!flaggedQuestions[q.id];
                const isActive = idx === currentQuestionIndex;

                let stateClass = "unvisited";
                if (isActive) stateClass = "active";
                else if (isFlagged) stateClass = "flagged";
                else if (isAnswered) stateClass = "answered";

                return (
                  <button
                    key={q.id}
                    className={`palette-item ${stateClass}`}
                    onClick={() => setCurrentQuestionIndex(idx)}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="palette-legend">
              <span className="legend-item"><span className="dot active"></span> Active</span>
              <span className="legend-item"><span className="dot answered"></span> Answered</span>
              <span className="legend-item"><span className="dot flagged"></span> Flagged</span>
              <span className="legend-item"><span className="dot unvisited"></span> Unvisited</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
