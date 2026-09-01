"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function HomePage() {
  // Typing animation state
  const phrases = [
    "Automated MediaPipe AI Proctoring",
    "GPT-4o Subjective LLM Evaluation",
    "Real-Time Live Surveillance Stream",
    "Tesseract OCR Handwritten Script Extraction",
    "Zero-Trust Browser Anti-Cheat Lockout"
  ];

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    const typingSpeed = isDeleting ? 40 : 80;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        setTypedText(currentPhrase.substring(0, typedText.length + 1));
        if (typedText.length + 1 === currentPhrase.length) {
          setTimeout(() => setIsDeleting(true), 2000); // Pause at end of phrase
        }
      } else {
        setTypedText(currentPhrase.substring(0, typedText.length - 1));
        if (typedText.length - 1 === 0) {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % phrases.length);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [typedText, isDeleting, phraseIndex, phrases]);

  return (
    <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto", padding: "1rem 0" }}>
      {/* Hero Section */}
      <section style={{
        textAlign: "center",
        padding: "3.5rem 1.5rem 3rem 1.5rem",
        background: "linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(241,245,249,0.95) 100%)",
        border: "1px solid var(--border-glass)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-card)",
        marginBottom: "2.5rem",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <span className="badge badge-student" style={{ padding: "0.45rem 1.1rem", fontSize: "0.82rem" }}>
            ✨ AI-Powered Intelligent Examination Platform v2.0
          </span>
        </div>

        <h1 style={{
          fontSize: "2.8rem",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          lineHeight: 1.25,
          marginBottom: "1rem"
        }}>
          Intelligent Examinations Powered by <br />
          <span style={{
            background: "linear-gradient(135deg, var(--primary-blue), var(--primary-purple))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            minHeight: "3.5rem",
            display: "inline-block"
          }}>
            {typedText}
            <span style={{
              display: "inline-block",
              width: "3px",
              height: "2.4rem",
              background: "var(--primary-blue)",
              marginLeft: "4px",
              verticalAlign: "middle",
              animation: "blink 0.8s infinite"
            }} />
          </span>
        </h1>

        <p style={{
          fontSize: "1.1rem",
          color: "var(--text-muted)",
          maxWidth: "760px",
          margin: "0 auto 2.25rem auto",
          lineHeight: 1.6
        }}>
          A Next-Generation Examination Suite combining client-side MediaPipe iris gaze tracking,
          GPT-4o subjective answer grading, Tesseract OCR handwritten script extraction, and live examiner surveillance.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: "flex", justifyContent: "center", gap: "1.25rem", flexWrap: "wrap" }}>
          <Link href="/dashboard" className="btn btn-primary" style={{ width: "auto", padding: "0.95rem 2.25rem", fontSize: "1rem" }}>
            🚀 Launch Examination Hub →
          </Link>
          <Link
            href="/proctor-live"
            className="btn"
            style={{
              width: "auto",
              padding: "0.95rem 2.25rem",
              fontSize: "1rem",
              background: "#ffffff",
              color: "#1e3a8a",
              border: "1.5px solid #bfdbfe !important",
              fontWeight: 800
            }}
          >
            🛡️ Live AI Proctor Monitor
          </Link>
        </div>
      </section>

      {/* Live Metric Stats Bar */}
      <section className="stats-grid" style={{ marginBottom: "2.5rem" }}>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>👁️</div>
          <div>
            <div className="metric-value">100%</div>
            <div className="metric-label">Client-Side MediaPipe Vision</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>⏱️</div>
          <div>
            <div className="metric-value">&lt; 50ms</div>
            <div className="metric-label">Telemetry Stream Latency</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: "#faf5ff", color: "#9333ea" }}>🤖</div>
          <div>
            <div className="metric-value">GPT-4o</div>
            <div className="metric-label">LLM Subjective Evaluator</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: "#ecfeff", color: "#0891b2" }}>🛡️</div>
          <div>
            <div className="metric-value">0 - 100</div>
            <div className="metric-label">Dynamic Suspicion Index</div>
          </div>
        </div>
      </section>

      {/* 3 Role Sign-In Portal Launch Cards */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)" }}>
            Select Your Role Portal
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginTop: "0.3rem" }}>
            Isolated, role-partitioned access paths for Candidates, Examiners, and Administrators.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
          {/* Candidate Student Card */}
          <Link href="/student/login" style={{ textDecoration: "none" }}>
            <div className="panel-card" style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              border: "1.5px solid #bfdbfe",
              background: "#eff6ff"
            }}>
              <div>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🎓</div>
                <span className="badge badge-student" style={{ marginBottom: "0.5rem" }}>Student Portal</span>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1d4ed8", margin: "0.3rem 0" }}>Candidate Sign In</h3>
                <p style={{ fontSize: "0.85rem", color: "#3b82f6", lineHeight: 1.5 }}>
                  Access scheduled exam papers, pre-exam identity verification, and fullscreen proctored test rooms.
                </p>
              </div>
              <div style={{ marginTop: "1.25rem", fontWeight: 800, color: "#1d4ed8", fontSize: "0.88rem" }}>
                Enter Student Portal →
              </div>
            </div>
          </Link>

          {/* Examiner Hub Card */}
          <Link href="/examiner/login" style={{ textDecoration: "none" }}>
            <div className="panel-card" style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              border: "1.5px solid #bbf7d0",
              background: "#f0fdf4"
            }}>
              <div>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📝</div>
                <span className="badge badge-examiner" style={{ marginBottom: "0.5rem" }}>Examiner Hub</span>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#15803d", margin: "0.3rem 0" }}>Examiner Sign In</h3>
                <p style={{ fontSize: "0.85rem", color: "#16a34a", lineHeight: 1.5 }}>
                  Manage Question Banks, configure exam papers, inspect GPT-4o LLM grading feedback, and monitor live candidate streams.
                </p>
              </div>
              <div style={{ marginTop: "1.25rem", fontWeight: 800, color: "#15803d", fontSize: "0.88rem" }}>
                Enter Examiner Hub →
              </div>
            </div>
          </Link>

          {/* Admin Portal Card */}
          <Link href="/admin/login" style={{ textDecoration: "none" }}>
            <div className="panel-card" style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              border: "1.5px solid #e9d5ff",
              background: "#faf5ff"
            }}>
              <div>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔒</div>
                <span className="badge badge-admin" style={{ marginBottom: "0.5rem" }}>System Admin</span>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#7e22ce", margin: "0.3rem 0" }}>Administrator Sign In</h3>
                <p style={{ fontSize: "0.85rem", color: "#9333ea", lineHeight: 1.5 }}>
                  Control user registration approvals for Students and Examiners, inspect security logs, and review platform audits.
                </p>
              </div>
              <div style={{ marginTop: "1.25rem", fontWeight: 800, color: "#7e22ce", fontSize: "0.88rem" }}>
                Enter Admin Portal →
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Core Platform Features Grid */}
      <section className="panel-card" style={{ padding: "2.25rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <span className="badge badge-examiner" style={{ marginBottom: "0.5rem" }}>Engine Capabilities</span>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)" }}>
            Engineered for Security & Academic Integrity
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.5rem" }}>
          <div style={{ padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#f8fafc" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>👁️</div>
            <h4 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>MediaPipe Iris & Gaze Tracking</h4>
            <p style={{ fontSize: "0.88rem", color: "#64748b", marginTop: "0.35rem", lineHeight: 1.5 }}>
              Continuous client-side computer vision tracking pupil offset ratios and face counts (N &gt; 1 or face absence) with real-time suspicion scoring.
            </p>
          </div>

          <div style={{ padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#f8fafc" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>🔒</div>
            <h4 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>Fullscreen & Browser Lockout</h4>
            <p style={{ fontSize: "0.88rem", color: "#64748b", marginTop: "0.35rem", lineHeight: 1.5 }}>
              Zero-Trust browser anti-cheat enforcing Fullscreen Mode, tab-switch detection, and locking right-click context menu, copy, and paste.
            </p>
          </div>

          <div style={{ padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#f8fafc" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>🤖</div>
            <h4 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>GPT-4o Subjective & OCR Grading</h4>
            <p style={{ fontSize: "0.88rem", color: "#64748b", marginTop: "0.35rem", lineHeight: 1.5 }}>
              Automated evaluation of subjective answers and Tesseract OCR handwritten script uploads against model answer keys with Examiner score overrides.
            </p>
          </div>

          <div style={{ padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#f8fafc" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>📡</div>
            <h4 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>Live WebSocket Surveillance</h4>
            <p style={{ fontSize: "0.88rem", color: "#64748b", marginTop: "0.35rem", lineHeight: 1.5 }}>
              Real-time telemetry streaming allowing Examiners to monitor candidate suspicion score gauges and issue force disqualification alerts.
            </p>
          </div>
        </div>
      </section>

      {/* Blinking Cursor Keyframes */}
      <style jsx global>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
