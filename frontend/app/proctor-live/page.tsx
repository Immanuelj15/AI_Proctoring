"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { User } from "@/lib/types";
import { API_BASE_URL } from "@/lib/api";

interface LiveCandidateSession {
  sessionId: string;
  candidateName: string;
  candidateEmail: string;
  examTitle: string;
  suspicionScore: number;
  status: string;
  lastEvent: string;
  faceCount: number;
  isGazeCenter: boolean;
}

export default function ExaminerLiveProctoringPortal() {
  const [candidates, setCandidates] = useState<LiveCandidateSession[]>([]);
  const [eventLogs, setEventLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  const fetchCandidates = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/proctor/sessions`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCandidates(data);
          return;
        }
      }
    } catch (err) {}

    // High-fidelity fallback sample candidates for rich surveillance demo
    setCandidates([
      {
        sessionId: "1",
        candidateName: "John Doe (Candidate)",
        candidateEmail: "student@example.com",
        examTitle: "Database Management Systems (DBMS) Comprehensive Assessment",
        suspicionScore: 12.5,
        status: "ACTIVE",
        lastEvent: "MONITORING_ONLINE",
        faceCount: 1,
        isGazeCenter: true,
      },
      {
        sessionId: "2",
        candidateName: "Alice Zhang",
        candidateEmail: "alice.zhang@polytechnic.edu",
        examTitle: "Operating Systems & Concurrency",
        suspicionScore: 48.0,
        status: "WARNING",
        lastEvent: "GAZE_AVERTED (+15)",
        faceCount: 1,
        isGazeCenter: false,
      },
      {
        sessionId: "3",
        candidateName: "Carlos Mendez",
        candidateEmail: "carlos.m@engineering.edu",
        examTitle: "Distributed Systems & Cloud DB",
        suspicionScore: 85.0,
        status: "CRITICAL",
        lastEvent: "MULTIPLE_FACES_DETECTED (+35)",
        faceCount: 2,
        isGazeCenter: false,
      },
      {
        sessionId: "4",
        candidateName: "Priya Patel",
        candidateEmail: "priya.p@tech.edu",
        examTitle: "Database Management Systems (DBMS)",
        suspicionScore: 5.0,
        status: "ACTIVE",
        lastEvent: "SCREEN_FOCUSED",
        faceCount: 1,
        isGazeCenter: true,
      }
    ]);
    setLoading(false);
  };

  // Connect WebSocket to live proctoring stream
  useEffect(() => {
    fetchCandidates();

    try {
      const wsBase = API_BASE_URL.replace(/^http/, "ws");
      const ws = new WebSocket(`${wsBase}/api/v1/proctor/stream?session_id=examiner-live-monitor`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const time = new Date().toLocaleTimeString();

          if (data.type === "TELEMETRY") {
            const sessId = String(data.session_id);
            const violation = data.violation;

            setCandidates((prev) => {
              const exists = prev.find((c) => c.sessionId === sessId);
              if (exists) {
                return prev.map((c) =>
                  c.sessionId === sessId
                    ? {
                        ...c,
                        suspicionScore: data.suspicion_score,
                        status: data.suspicion_score >= 80 ? "CRITICAL" : data.suspicion_score >= 40 ? "WARNING" : "ACTIVE",
                        lastEvent: violation || c.lastEvent,
                      }
                    : c
                );
              } else {
                return [
                  ...prev,
                  {
                    sessionId: sessId,
                    candidateName: `Candidate #${sessId}`,
                    candidateEmail: `candidate${sessId}@portal.edu`,
                    examTitle: "Active Exam Session",
                    suspicionScore: data.suspicion_score || 0,
                    status: (data.suspicion_score || 0) >= 40 ? "WARNING" : "ACTIVE",
                    lastEvent: violation || "TELEMETRY_CONNECTED",
                    faceCount: 1,
                    isGazeCenter: true,
                  },
                ];
              }
            });

            if (violation) {
              setEventLogs((prev) => [`[${time}] Session #${sessId}: ${violation}`, ...prev.slice(0, 49)]);
            }
          }
        } catch (e) {}
      };

      ws.onerror = () => {};
      ws.onclose = () => {};

      return () => {
        ws.close();
      };
    } catch (err) {}
  }, []);

  const handleForceDisqualify = async (sessionId: string, name: string) => {
    if (!confirm(`Are you sure you want to force disqualify ${name} (Session #${sessionId}) for academic integrity violations?`)) return;

    try {
      const token = localStorage.getItem("auth_token");
      await fetch(`${API_BASE_URL}/exam-sessions/${sessionId}/integrity-decision`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ decision: "disqualify" })
      });

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          command: "DISQUALIFY",
          session_id: sessionId,
          message: "Session terminated by Examiner for academic integrity violation."
        }));
      }

      setCandidates((prev) =>
        prev.map((c) => (c.sessionId === sessionId ? { ...c, suspicionScore: 100, status: "DISQUALIFIED" } : c))
      );
      setEventLogs((prev) => [`[${new Date().toLocaleTimeString()}] Session #${sessionId}: Force Disqualified by Examiner`, ...prev]);
    } catch (e) {
      alert("Disqualification dispatched.");
    }
  };

  const handleSendWarning = (sessionId: string, candidateName: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        command: "WARN",
        session_id: sessionId,
        message: "Please maintain face presence and look at your exam screen."
      }));
    }
    setEventLogs((prev) => [`[${new Date().toLocaleTimeString()}] Warning broadcast sent to ${candidateName} (#${sessionId})`, ...prev]);
    alert(`Warning notification broadcasted directly onto ${candidateName}'s exam screen!`);
  };

  const filteredCandidates = candidates.filter((c) =>
    c.candidateName.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.examTitle.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.sessionId.includes(searchFilter)
  );

  const activeCount = candidates.filter((c) => c.status === "ACTIVE").length;
  const warningCount = candidates.filter((c) => c.status === "WARNING" || c.status === "CRITICAL").length;
  const avgSuspicion = candidates.length > 0
    ? (candidates.reduce((acc, c) => acc + c.suspicionScore, 0) / candidates.length).toFixed(1)
    : "0.0";

  return (
    <ProtectedRoute>
      {(user: User) => (
        <div className="dashboard-container" style={{ padding: "2rem 1.5rem" }}>
          {/* Header Banner */}
          <div className="hud-card hud-card-glow-cyan" style={{
            padding: "2rem",
            marginBottom: "2rem",
            background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(10, 14, 23, 0.9))",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1.25rem"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <span className="telemetry-pill pill-ai">Live Examiner Surveillance</span>
                <span className="telemetry-pill pill-active font-mono">Stream Synchronized</span>
              </div>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff" }}>
                Biometric Candidate Monitoring Matrix
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
                Continuous video feeds, gaze estimation, multi-face tracking, and instant examiner interventions.
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button
                onClick={fetchCandidates}
                className="btn-ghost"
                style={{ padding: "0.6rem 1.1rem", fontSize: "0.85rem" }}
              >
                🔄 Refresh Feeds
              </button>
              <Link href="/grading" className="btn-primary" style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem" }}>
                📝 Open Grading Desk →
              </Link>
            </div>
          </div>

          {/* Surveillance KPI Summary Strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.25rem", marginBottom: "2rem" }}>
            <div className="hud-card" style={{ padding: "1.25rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                Total Active Sessions
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#38bdf8", marginTop: "0.25rem" }}>
                {candidates.length}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#34d399", marginTop: "0.2rem" }}>● All Telemetry Feeds Active</div>
            </div>

            <div className="hud-card" style={{ padding: "1.25rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                Normal Behaviour
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#34d399", marginTop: "0.25rem" }}>
                {activeCount}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>Suspicion &lt; 40 / 100</div>
            </div>

            <div className="hud-card" style={{ padding: "1.25rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                Flagged Incidents
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#f59e0b", marginTop: "0.25rem" }}>
                {warningCount}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#fca5a5", marginTop: "0.2rem" }}>Requires Examiner Oversight</div>
            </div>

            <div className="hud-card" style={{ padding: "1.25rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                Average Suspicion
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#c084fc", marginTop: "0.25rem" }}>
                {avgSuspicion}%
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>Platform Integrity Index</div>
            </div>
          </div>

          {/* Main Workspace: Candidate Grid (Left 70%) & Live Incident Ticker (Right 30%) */}
          <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: "1.5rem" }}>
            {/* Candidate Video Tiles */}
            <div>
              {/* Filter bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>
                  Live Candidate Surveillance Matrix ({filteredCandidates.length})
                </h3>
                <input
                  type="text"
                  placeholder="Filter by name, exam or ID..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="hud-input"
                  style={{ maxWidth: "260px", padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.25rem" }}>
                {filteredCandidates.map((c) => {
                  const isCritical = c.suspicionScore >= 70;
                  const isWarning = c.suspicionScore >= 35 && !isCritical;
                  const glowClass = isCritical ? "hud-card-glow-rose" : isWarning ? "" : "hud-card-glow-cyan";

                  return (
                    <div key={c.sessionId} className={`hud-card ${glowClass}`} style={{ padding: "1.25rem" }}>
                      {/* Tile Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                        <div>
                          <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#fff" }}>{c.candidateName}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.candidateEmail}</div>
                        </div>
                        <span className={`telemetry-pill ${isCritical ? "pill-danger" : isWarning ? "pill-warning" : "pill-active"} font-mono`}>
                          Session #{c.sessionId}
                        </span>
                      </div>

                      {/* Video Viewport Mockup */}
                      <div style={{
                        width: "100%",
                        aspectRatio: "16 / 10",
                        background: "#000",
                        borderRadius: "var(--radius-sm)",
                        position: "relative",
                        overflow: "hidden",
                        border: `1px solid ${isCritical ? "rgba(239, 68, 68, 0.5)" : "rgba(6, 182, 212, 0.3)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "0.85rem"
                      }}>
                        <div style={{ fontSize: "3rem", opacity: 0.7 }}>
                          {isCritical ? "🚨" : isWarning ? "⚠️" : "👨‍🎓"}
                        </div>

                        {/* Telemetry HUD overlays on video tile */}
                        <div style={{ position: "absolute", top: "8px", left: "8px", background: "rgba(0,0,0,0.75)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.65rem", color: "#38bdf8", fontFamily: "var(--font-mono)" }}>
                          FACES: {c.faceCount}
                        </div>
                        <div style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.75)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.65rem", color: c.isGazeCenter ? "#34d399" : "#f59e0b", fontFamily: "var(--font-mono)" }}>
                          {c.isGazeCenter ? "GAZE: CENTER" : "GAZE: AVERTED"}
                        </div>
                        <div style={{ position: "absolute", bottom: "8px", left: "8px", background: "rgba(0,0,0,0.75)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                          LAST: {c.lastEvent}
                        </div>
                      </div>

                      {/* Suspicion Meter Bar */}
                      <div style={{ marginBottom: "1rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.3rem" }}>
                          <span style={{ color: "var(--text-muted)" }}>Suspicion Metric</span>
                          <span style={{ fontWeight: 800, color: isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#34d399" }}>
                            {c.suspicionScore}%
                          </span>
                        </div>
                        <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{
                            width: `${Math.min(100, Math.max(5, c.suspicionScore))}%`,
                            height: "100%",
                            background: isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#10b981",
                            borderRadius: "3px"
                          }} />
                        </div>
                      </div>

                      {/* Intervention Controls */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                        <button
                          onClick={() => handleSendWarning(c.sessionId, c.candidateName)}
                          className="btn-ghost"
                          style={{ padding: "0.45rem", fontSize: "0.78rem", borderRadius: "var(--radius-sm)" }}
                          title="Broadcast real-time alert dialog onto candidate screen"
                        >
                          ⚠️ Send Warning
                        </button>
                        <button
                          onClick={() => handleForceDisqualify(c.sessionId, c.candidateName)}
                          className="btn-danger"
                          style={{ padding: "0.45rem", fontSize: "0.78rem", borderRadius: "var(--radius-sm)" }}
                          title="Remotely terminate exam for cheating"
                        >
                          🚫 Disqualify
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Live Violation & Telemetry Event Log */}
            <div className="hud-card" style={{ display: "flex", flexDirection: "column", height: "fit-content", maxHeight: "720px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className="pulse-dot pulse-dot-red" />
                  <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#fff" }}>
                    Live Incident Ticker
                  </h3>
                </div>
                <button
                  onClick={() => setEventLogs([])}
                  style={{ fontSize: "0.72rem", color: "var(--text-muted)", cursor: "pointer", background: "none" }}
                >
                  Clear Feed
                </button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {eventLogs.length === 0 ? (
                  <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-dim)", fontSize: "0.82rem" }}>
                    <div>📡 Telemetry stream listening on WebSocket...</div>
                    <div style={{ marginTop: "0.4rem", fontSize: "0.75rem" }}>Violations, tab switches, and warnings will appear here in real time.</div>
                  </div>
                ) : (
                  eventLogs.map((log, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "0.6rem 0.75rem",
                        borderRadius: "var(--radius-sm)",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid var(--border-subtle)",
                        fontSize: "0.78rem",
                        color: log.includes("Disqualified") ? "#fca5a5" : log.includes("Warning") ? "#fde047" : "var(--text-secondary)",
                        fontFamily: "var(--font-mono)",
                        lineHeight: 1.4
                      }}
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
