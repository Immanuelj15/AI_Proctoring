"use client";

import React from "react";
import { User } from "@/lib/types";
import { AnimatedModal, Button } from "@/components/motion";

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
    <AnimatedModal isOpen={true} onClose={onCancel} maxWidth="580px">
      <div className="auth-card" style={{ maxWidth: "580px", padding: "2.25rem", margin: 0, border: "1px solid var(--border-light)", boxShadow: "0 0 40px rgba(6, 182, 212, 0.15)" }}>
        <div className="card-header" style={{ textAlign: "left", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span className="badge badge-student">
              Pre-Exam Verification
            </span>
            <span className="badge badge-examiner">
              ⏱ {durationMinutes} Minutes
            </span>
          </div>
          <h2 className="card-title" style={{ fontSize: "1.45rem", marginTop: "0.25rem" }}>{examTitle}</h2>
          <p className="card-description">
            Monitored by AI Proctoring Engine with Zero-Trust Fullscreen Lockdown.
          </p>
        </div>

        {/* Candidate Identification Box */}
        <div style={{
          background: "rgba(15, 23, 42, 0.7)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
          marginBottom: "1.25rem"
        }}>
          <h4 style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--primary-cyan)", textTransform: "uppercase", marginBottom: "0.6rem", letterSpacing: "0.04em" }}>
            👤 Verified Candidate Identity
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            <div>Name: <strong style={{ color: "#fff" }}>{candidate.name}</strong></div>
            <div>Role: <strong style={{ textTransform: "uppercase", color: "var(--primary-cyan)" }}>{candidate.role}</strong></div>
            <div style={{ gridColumn: "span 2" }}>
              Email: <strong style={{ color: "#fff" }}>{candidate.email}</strong>
            </div>
          </div>
        </div>

        {/* Proctoring Rules List */}
        <div style={{
          background: "rgba(245, 158, 11, 0.08)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
          marginBottom: "1.75rem",
          fontSize: "0.83rem",
          color: "var(--text-secondary)"
        }}>
          <h4 style={{ fontSize: "0.88rem", fontWeight: 800, color: "#fbbf24", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span>⚠️</span> Strict Proctoring & Anti-Cheat Protocol
          </h4>
          <ul style={{ paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.35rem", lineHeight: 1.45 }}>
            <li><strong style={{ color: "#fff" }}>Mandatory Fullscreen</strong>: Initiating the exam activates fullscreen lockdown. Exiting full-screen or switching tabs accumulates suspicion strikes.</li>
            <li><strong style={{ color: "#fff" }}>Webcam Biometrics</strong>: MediaPipe AI audits eye gaze vector, head orientation, and single-candidate presence continuously.</li>
            <li><strong style={{ color: "#fff" }}>Clipboard Lock</strong>: Copy, paste, right-click, and text selection are strictly disabled.</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "0.85rem" }}>
          <Button
            type="button"
            variant="primary"
            style={{ flex: 1, padding: "0.8rem 1.25rem" }}
            onClick={onAgreeAndStart}
          >
            🚀 Agree & Launch Exam
          </Button>
          <Button
            type="button"
            variant="ghost"
            style={{ padding: "0.8rem 1.25rem" }}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </AnimatedModal>
  );
}
