"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { User } from "@/lib/types";

interface LiveCandidateSession {
  sessionId: string;
  candidateName: string;
  candidateEmail: string;
  examTitle: string;
  suspicionScore: number;
  status: "ACTIVE" | "WARNING" | "DISQUALIFIED" | "SUBMITTED";
  lastEvent: string;
  faceCount: number;
  isGazeCenter: boolean;
}

export default function ExaminerLiveProctoringPortal() {
  const [candidates, setCandidates] = useState<LiveCandidateSession[]>([
    {
      sessionId: "sim-session-1",
      candidateName: "John Student",
      candidateEmail: "student@example.com",
      examTitle: "Computer Science Midterm",
      suspicionScore: 15,
      status: "ACTIVE",
      lastEvent: "GAZE_CENTER_OK",
      faceCount: 1,
      isGazeCenter: true,
    },
    {
      sessionId: "session-102",
      candidateName: "Alice Smith",
      candidateEmail: "alice@example.com",
      examTitle: "Operating Systems & Networking",
      suspicionScore: 65,
      status: "WARNING",
      lastEvent: "OFF_SCREEN_GAZE (+15)",
      faceCount: 1,
      isGazeCenter: false,
    },
    {
      sessionId: "session-103",
      candidateName: "Bob Jones",
      candidateEmail: "bob@example.com",
      examTitle: "Computer Science Midterm",
      suspicionScore: 100,
      status: "DISQUALIFIED",
      lastEvent: "MULTIPLE_FACES_DETECTED (+30)",
      faceCount: 2,
      isGazeCenter: false,
    }
  ]);

  const [eventLogs, setEventLogs] = useState<string[]>([
    "[15:45:02] Alice Smith: OFF_SCREEN_GAZE detected (Suspicion Index: 65)",
    "[15:44:18] Bob Jones: MULTIPLE_FACES_DETECTED -> Auto-Disqualified (Suspicion Index: 100)",
    "[15:42:10] John Student: Session Started (Suspicion Index: 0)"
  ]);

  // Connect WebSocket to live proctoring stream
  useEffect(() => {
    try {
      const ws = new WebSocket("ws://127.0.0.1:8000/api/v1/proctor/stream?session_id=examiner-live-monitor");
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.event_type) {
          const logMsg = `[${new Date().toLocaleTimeString()}] Live Telemetry: ${data.event_type} (+${data.suspicion_increment})`;
          setEventLogs((prev) => [logMsg, ...prev.slice(0, 20)]);
        }
      };
      return () => ws.close();
    } catch (err) {}
  }, []);

  const handleForceDisqualify = (sessionId: string) => {
    if (!confirm("Are you sure you want to force disqualify this candidate session?")) return;
    setCandidates((prev) =>
      prev.map((c) => (c.sessionId === sessionId ? { ...c, suspicionScore: 100, status: "DISQUALIFIED" } : c))
    );
    alert("Candidate session force disqualified.");
  };

  const handleSendWarning = (sessionId: string, candidateName: string) => {
    alert(`Warning notification sent to ${candidateName}'s exam screen!`);
  };

  const getGaugeColor = (score: number) => {
    if (score >= 70) return "#ef4444";
    if (score >= 30) return "#f59e0b";
    return "#10b981";
  };

  const getPulseDotClass = (status: string) => {
    if (status === "DISQUALIFIED") return "pulse-dot red";
    if (status === "WARNING") return "pulse-dot amber";
    return "pulse-dot emerald";
  };

  return (
    <ProtectedRoute>
      {(user: User) => (
        <div className="dashboard-container">
          {/* Hero Banner */}
          <div className="dashboard-hero" style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)" }}>
            <div>
              <span className="badge badge-examiner" style={{ background: "#ffffff", color: "#1e3a8a" }}>
                Live AI Surveillance
              </span>
              <h2 className="hero-title">Real-Time Proctoring Monitor</h2>
              <p className="hero-email">Continuous MediaPipe Iris Tracking, Multi-Face Detection & Telemetry Feed</p>
            </div>
            <div>
              <Link href="/dashboard" className="btn btn-primary" style={{ background: "#ffffff", color: "#1e3a8a", fontWeight: 800 }}>
                ← Examiner Hub
              </Link>
            </div>
          </div>

          {/* Active Candidates Live Grid */}
          <div className="panel-card">
            <div className="panel-header">
              <h3 className="panel-title">🛡️ Active Monitored Candidates ({candidates.length})</h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }}>
              {candidates.map((c) => (
                <div key={c.sessionId} style={{
                  padding: "1.25rem",
                  border: `2px solid ${c.status === "DISQUALIFIED" ? "#fca5a5" : c.status === "WARNING" ? "#fde68a" : "#cbd5e1"}`,
                  borderRadius: "14px",
                  background: c.status === "DISQUALIFIED" ? "#fef2f2" : "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "1rem"
                }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span className={getPulseDotClass(c.status)}></span>
                        <span className={`badge ${c.status === "DISQUALIFIED" ? "badge-admin" : c.status === "WARNING" ? "badge-student" : "badge-examiner"}`}>
                          {c.status}
                        </span>
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "#64748b" }}>ID: {c.sessionId}</span>
                    </div>

                    <h4 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>{c.candidateName}</h4>
                    <p style={{ fontSize: "0.82rem", color: "#64748b" }}>{c.candidateEmail}</p>
                    <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e3a8a", marginTop: "0.25rem" }}>{c.examTitle}</p>
                  </div>

                  {/* Suspicion Score Gauge Bar */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 800, marginBottom: "0.35rem" }}>
                      <span>Suspicion Index</span>
                      <span style={{ color: getGaugeColor(c.suspicionScore) }}>{c.suspicionScore} / 100</span>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                      <div style={{
                        width: `${c.suspicionScore}%`,
                        height: "100%",
                        background: getGaugeColor(c.suspicionScore),
                        transition: "all 0.3s ease"
                      }} />
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.35rem" }}>
                      Last Event: <strong>{c.lastEvent}</strong>
                    </div>
                  </div>

                  {/* Examiner Interactive Action Buttons */}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="btn"
                      style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", fontSize: "0.78rem", padding: "0.45rem" }}
                      onClick={() => handleSendWarning(c.sessionId, c.candidateName)}
                      disabled={c.status === "DISQUALIFIED"}
                    >
                      ⚠️ Warn
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ fontSize: "0.78rem", padding: "0.45rem" }}
                      onClick={() => handleForceDisqualify(c.sessionId)}
                      disabled={c.status === "DISQUALIFIED"}
                    >
                      🚨 Disqualify
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-Time Violation Event Stream Feed */}
          <div className="panel-card">
            <div className="panel-header">
              <h3 className="panel-title">📡 Real-Time Telemetry Event Log Feed</h3>
            </div>

            <div style={{
              background: "#0f172a",
              color: "#38bdf8",
              fontFamily: "monospace",
              fontSize: "0.85rem",
              padding: "1rem 1.25rem",
              borderRadius: "12px",
              maxHeight: "200px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem"
            }}>
              {eventLogs.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
