"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setToken } from "@/lib/auth";
import { loginUser, getCurrentUser } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();

  // Typing animation state
  const phrases = [
    "Real-Time Biometric Face & Gaze Tracking",
    "Dual-Track GPT-4o & OCR Evaluation",
    "Live Examiner Surveillance Matrix",
    "Zero-Trust Fullscreen & Tab Lockdown",
    "SHA-256 Tamper-Evident Scorecards"
  ];

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  // Simulated live proctoring HUD state
  const [hudGaze, setHudGaze] = useState("CENTERED (99%)");
  const [hudAudio, setHudAudio] = useState(14);
  const [hudPing, setHudPing] = useState(18);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    const typingSpeed = isDeleting ? 35 : 75;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        setTypedText(currentPhrase.substring(0, typedText.length + 1));
        if (typedText.length + 1 === currentPhrase.length) {
          setTimeout(() => setIsDeleting(true), 2200);
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

  // Telemetry HUD live simulation jitter
  useEffect(() => {
    const interval = setInterval(() => {
      setHudAudio(Math.floor(10 + Math.random() * 25));
      setHudPing(Math.floor(15 + Math.random() * 12));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const handleLaunchDemo = async (role: "student" | "examiner" | "grading", url: string) => {
    setDemoLoading(role);
    try {
      const email = role === "student" ? "student@example.com" : "examiner@example.com";
      const password = role === "student" ? "StudentPassword123!" : "ExaminerPassword123!";
      
      const res = await loginUser({ email, password });
      setToken(res.access_token);
      
      const user = await getCurrentUser(res.access_token);
      localStorage.setItem("user", JSON.stringify(user));
      
      router.push(url);
    } catch (e: any) {
      alert(`Error launching demo: ${e.message || "Failed to authenticate"}`);
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="dashboard-container" style={{ padding: "2.5rem 1.5rem" }}>
      {/* Hero Section */}
      <section className="hud-card" style={{
        padding: "3.5rem 2.5rem",
        marginBottom: "2.5rem",
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 14, 23, 0.95) 100%)",
        border: "1px solid var(--border-light)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Glow ambient background light */}
        <div style={{
          position: "absolute",
          top: "-30%",
          right: "-10%",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none"
        }} />

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "3rem", alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <span className="telemetry-pill pill-ai">
                <span className="pulse-dot pulse-dot-green" /> Next-Gen AI Examination Platform
              </span>
              <span className="telemetry-pill pill-neutral font-mono">v2.4 Enterprise</span>
            </div>

            <h1 style={{
              fontSize: "3rem",
              fontWeight: 800,
              lineHeight: 1.18,
              letterSpacing: "-0.03em",
              marginBottom: "1.25rem",
              color: "#fff"
            }}>
              Intelligent Proctoring & <br />
              <span style={{
                background: "linear-gradient(90deg, #38bdf8, #818cf8, #c084fc)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}>
                Dual-Track Evaluation
              </span>
            </h1>

            <div style={{
              fontSize: "1.15rem",
              color: "var(--text-secondary)",
              minHeight: "2.2rem",
              marginBottom: "2rem",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "0.4rem"
            }}>
              <span style={{ color: "var(--primary-cyan)" }}>&gt;</span>
              <span>{typedText}</span>
              <span style={{ animation: "pulseGlow 1s infinite", color: "var(--primary-cyan)" }}>|</span>
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "2.5rem", maxWidth: "560px" }}>
              A full-stack, enterprise-grade online testing ecosystem featuring real-time computer vision proctoring,
              zero-trust browser lockdown, GPT-4o assisted subjective evaluation, Tesseract OCR handwritten script analysis,
              and tamper-evident SHA-256 PDF scorecard generation.
            </p>

            {/* Quick Demo CTA Buttons */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
              <button
                onClick={() => handleLaunchDemo("student", "/exam/1")}
                disabled={!!demoLoading}
                className="btn-primary"
                style={{ padding: "0.85rem 1.75rem", fontSize: "0.95rem" }}
              >
                {demoLoading === "student" ? "Launching Exam..." : "🚀 Launch DBMS Exam (Student)"}
              </button>

              <button
                onClick={() => handleLaunchDemo("examiner", "/proctor-live")}
                disabled={!!demoLoading}
                className="btn-ghost"
                style={{ padding: "0.85rem 1.5rem", fontSize: "0.95rem", borderColor: "var(--border-light)" }}
              >
                {demoLoading === "examiner" ? "Opening..." : "👁️ Live Surveillance Matrix"}
              </button>

              <button
                onClick={() => handleLaunchDemo("grading", "/grading")}
                disabled={!!demoLoading}
                className="btn-ghost"
                style={{ padding: "0.85rem 1.5rem", fontSize: "0.95rem", borderColor: "var(--border-light)" }}
              >
                {demoLoading === "grading" ? "Opening..." : "📝 Evaluation Workbench"}
              </button>
            </div>
          </div>

          {/* Interactive Simulated Biometric HUD Widget */}
          <div className="hud-card hud-card-glow-cyan" style={{ padding: "1.25rem", background: "rgba(10, 14, 23, 0.9)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="pulse-dot pulse-dot-green" />
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Biometric Telemetry HUD
                </span>
              </div>
              <span className="telemetry-pill pill-active font-mono" style={{ fontSize: "0.7rem" }}>
                LIVE 30 FPS
              </span>
            </div>

            {/* Camera Viewport with Biometric Overlays */}
            <div style={{
              width: "100%",
              aspectRatio: "16 / 10",
              background: "#000",
              borderRadius: "var(--radius-md)",
              position: "relative",
              overflow: "hidden",
              border: "1px solid rgba(6, 182, 212, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              {/* Corner Reticles */}
              <div className="scanner-corner corner-tl" />
              <div className="scanner-corner corner-tr" />
              <div className="scanner-corner corner-bl" />
              <div className="scanner-corner corner-br" />

              {/* Simulated Face Bounding Box with Mesh Grid */}
              <div style={{
                width: "140px",
                height: "170px",
                border: "2px dashed #06b6d4",
                borderRadius: "24px",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(6, 182, 212, 0.05)",
                boxShadow: "0 0 25px rgba(6, 182, 212, 0.2) inset"
              }}>
                <div style={{ fontSize: "2.5rem", opacity: 0.85 }}>🧑‍💻</div>
                <div style={{
                  position: "absolute",
                  top: "-10px",
                  background: "#06b6d4",
                  color: "#000",
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  padding: "1px 6px",
                  borderRadius: "4px"
                }}>
                  FACE DETECTED: 99.4%
                </div>
                <div style={{
                  position: "absolute",
                  bottom: "-10px",
                  background: "rgba(16, 185, 129, 0.9)",
                  color: "#fff",
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  padding: "1px 6px",
                  borderRadius: "4px"
                }}>
                  GAZE: SCREEN FOCUS
                </div>
              </div>

              {/* Top HUD Telemetry Info */}
              <div style={{
                position: "absolute",
                top: "10px",
                left: "12px",
                fontSize: "0.68rem",
                color: "#94a3b8",
                fontFamily: "var(--font-mono)",
                lineHeight: 1.4
              }}>
                <div>STATUS: SECURE_LOCKDOWN</div>
                <div>WS PING: {hudPing}ms</div>
                <div>AUDIO: {hudAudio} dB (QUIET)</div>
              </div>

              <div style={{
                position: "absolute",
                top: "10px",
                right: "12px",
                fontSize: "0.68rem",
                color: "#10b981",
                fontFamily: "var(--font-mono)",
                textAlign: "right"
              }}>
                <div>STRIKES: 0 / 3</div>
                <div>TAB LOCK: ACTIVE</div>
              </div>
            </div>

            {/* HUD Status Bar Below Camera */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginTop: "0.85rem" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Orientation</div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#38bdf8" }}>0.0° YAW (CENTER)</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Suspicion Index</div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#34d399" }}>0.0 / 100 (LOW)</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Audio Monitor</div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#a78bfa" }}>SPEECH SILENT</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real-Time Platform Performance Metrics */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.25rem", marginBottom: "2.5rem" }}>
        <div className="hud-card">
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.4rem" }}>
            Biometric Accuracy
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#38bdf8" }}>99.8%</div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>Sub-millimeter face landmark mesh detection</p>
        </div>

        <div className="hud-card">
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.4rem" }}>
            Telemetry Latency
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#34d399" }}>&lt; 35 ms</div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>WebSocket continuous examiner stream</p>
        </div>

        <div className="hud-card">
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.4rem" }}>
            Dual-Track Grading
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#c084fc" }}>Deterministic + AI</div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>OCR handwritten scripts + GPT-4o scoring</p>
        </div>

        <div className="hud-card">
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.4rem" }}>
            Integrity Verification
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#fbbf24" }}>SHA-256</div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>Cryptographically sealed PDF scorecards</p>
        </div>
      </section>

      {/* Comprehensive Feature Grid */}
      <section style={{ marginBottom: "3rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <span className="telemetry-pill pill-ai" style={{ marginBottom: "0.5rem" }}>Core Engine Modules</span>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "#fff" }}>Enterprise Architecture & Capabilities</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
          {/* Card 1 */}
          <div className="hud-card hud-card-glow-cyan">
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>👁️</div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem" }}>
              Biometric Vision Proctoring
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>
              Real-time face detection, head-pose estimation (yaw, pitch, roll), gaze aversion tracking, multi-person identification,
              and device detection alerts streamed continuously to examiner consoles.
            </p>
          </div>

          {/* Card 2 */}
          <div className="hud-card hud-card-glow-violet">
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🔒</div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem" }}>
              Zero-Trust Browser Lockout
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>
              Enforced fullscreen lockdown, clipboard neutralization (copy/paste/cut disabled), right-click context menu blocking,
              and strike accumulation with remote examiner force-disqualification.
            </p>
          </div>

          {/* Card 3 */}
          <div className="hud-card hud-card-glow-rose">
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🤖</div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem" }}>
              Dual-Track AI & OCR Grading
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>
              Automatic instantaneous evaluation for objective MCQ/MSQ, Tesseract OCR transcription of handwritten calculations and diagrams,
              combined with GPT-4o subjective semantic scoring.
            </p>
          </div>

          {/* Card 4 */}
          <div className="hud-card">
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📡</div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem" }}>
              Examiner Live Surveillance Wall
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>
              Multi-candidate grid monitor with instant live telemetry badges, chronological violation event ticker,
              and 1-click candidate intervention (warning modal push or remote disqualification).
            </p>
          </div>

          {/* Card 5 */}
          <div className="hud-card">
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📑</div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem" }}>
              Examiner Review Workbench
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>
              Side-by-side answer audit interface comparing student response, model answer, AI breakdown, and OCR output.
              Examiners can adjust marks, enter feedback notes, and issue final publishing decisions.
            </p>
          </div>

          {/* Card 6 */}
          <div className="hud-card">
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🛡️</div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem" }}>
              Tamper-Evident PDF Scorecards
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>
              Institutional scorecards generated on demand via ReportLab, embedded with SHA-256 digital verification hashes,
              integrity status badges, question-by-question marks, and examiner signatures.
            </p>
          </div>
        </div>
      </section>

      {/* End-to-End Workflow Flowchart Banner */}
      <section className="hud-card" style={{ padding: "2rem", textAlign: "center" }}>
        <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", marginBottom: "1.5rem" }}>
          End-to-End Lifecycle: Candidate Authentication to Verified Scorecard
        </h3>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ flex: 1, minWidth: "160px", background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>1️⃣</div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff" }}>Secure Authentication</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>RBAC approval check & token issue</div>
          </div>
          <div style={{ color: "var(--primary-cyan)", fontWeight: 800 }}>➔</div>
          <div style={{ flex: 1, minWidth: "160px", background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>2️⃣</div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#38bdf8" }}>Timed Exam & Live CV</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Biometric streaming & autosave</div>
          </div>
          <div style={{ color: "var(--primary-cyan)", fontWeight: 800 }}>➔</div>
          <div style={{ flex: 1, minWidth: "160px", background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>3️⃣</div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#c084fc" }}>Dual-Track Scoring</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Auto-grading, OCR & GPT-4o</div>
          </div>
          <div style={{ color: "var(--primary-cyan)", fontWeight: 800 }}>➔</div>
          <div style={{ flex: 1, minWidth: "160px", background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>4️⃣</div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#fbbf24" }}>Examiner Audit</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Review suspicion & overrides</div>
          </div>
          <div style={{ color: "var(--primary-cyan)", fontWeight: 800 }}>➔</div>
          <div style={{ flex: 1, minWidth: "160px", background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>5️⃣</div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#34d399" }}>SHA-256 PDF Report</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Tamper-evident certification</div>
          </div>
        </div>
      </section>
    </div>
  );
}
