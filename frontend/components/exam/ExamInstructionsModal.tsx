"use client";

import React from "react";
import { User } from "@/lib/types";

interface ExamInstructionsModalProps {
  examTitle: string;
  durationMinutes: number;
  candidate: User;
  onAgreeAndStart: () => void;
  onCancel: () => void;
}

export default function ExamInstructionsModal({
  examTitle,
  durationMinutes,
  candidate,
  onAgreeAndStart,
  onCancel,
}: ExamInstructionsModalProps) {
  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(15, 23, 42, 0.82)",
      backdropFilter: "blur(12px)",
      zIndex: 200,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem"
    }}>
      <div className="auth-card" style={{ maxWidth: "560px", padding: "2.25rem" }}>
        <div className="card-header">
          <span className="badge badge-student" style={{ marginBottom: "0.5rem" }}>
            Pre-Exam Verification
          </span>
          <h2 className="card-title" style={{ fontSize: "1.5rem" }}>{examTitle}</h2>
          <p className="card-description">
            Duration: <strong>{durationMinutes} Minutes</strong> | Monitored by AI Proctoring
          </p>
        </div>

        {/* Candidate Identification Box */}
        <div style={{
          background: "#f8fafc",
          border: "1.5px solid #cbd5e1",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
          marginBottom: "1.25rem"
        }}>
          <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            👤 Verified Candidate Identity
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", fontSize: "0.85rem", color: "#334155" }}>
            <div>Name: <strong>{candidate.name}</strong></div>
            <div>Role: <strong style={{ textTransform: "uppercase" }}>{candidate.role}</strong></div>
            <div style={{ gridColumn: "span 2" }}>
              Email: <strong>{candidate.email}</strong>
            </div>
            <div style={{ gridColumn: "span 2" }}>
              Phone Number: <strong>{candidate.phone_number || "+1 (555) 019-2831"}</strong>
            </div>
          </div>
        </div>

        {/* Proctoring Rules List */}
        <div style={{
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
          fontSize: "0.85rem",
          color: "#92400e"
        }}>
          <h4 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#b45309", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            ⚠️ Strict Proctoring & Anti-Cheat Rules
          </h4>
          <ul style={{ paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.4rem", lineHeight: 1.4 }}>
            <li><strong>Mandatory Fullscreen Mode</strong>: Starting the exam will launch full-screen mode. Exiting full-screen or switching windows will log suspicion events and auto-terminate your exam!</li>
            <li><strong>Webcam & Face Tracking</strong>: MediaPipe FaceMesh tracks iris gaze direction and face count ($N=1$).</li>
            <li><strong>Browser Restrictions</strong>: Right-click, copy-paste, and text selection are locked.</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button type="button" className="btn btn-primary" onClick={onAgreeAndStart}>
            🚀 I Agree & Start Fullscreen Exam
          </button>
          <button type="button" className="btn btn-danger" style={{ width: "auto" }} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
