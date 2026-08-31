import Link from "next/link";

export default function Home() {
  return (
    <div className="auth-card" style={{ maxWidth: "680px", textAlign: "center", padding: "3rem" }}>
      <div className="card-header">
        <div className="logo-icon" style={{ width: "64px", height: "64px", fontSize: "1.75rem", margin: "0 auto 1.5rem" }}>
          AI
        </div>
        <h2 className="card-title" style={{ fontSize: "2rem" }}>
          AI-Based Intelligent Examination Platform
        </h2>
        <p className="card-description" style={{ fontSize: "1rem", marginTop: "0.75rem", lineHeight: 1.6 }}>
          Next-generation assessment engine featuring automated AI proctoring, MediaPipe eye-gaze tracking, structured question banks, and GPT-4o subjective evaluation.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", margin: "2rem 0" }}>
        <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>🎓</div>
          <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e3a8a" }}>Student Room</h4>
          <p style={{ fontSize: "0.78rem", color: "#64748b" }}>Secured timed exam room with proctoring.</p>
        </div>
        <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>📝</div>
          <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e3a8a" }}>Examiner Hub</h4>
          <p style={{ fontSize: "0.78rem", color: "#64748b" }}>Question bank & exam paper manager.</p>
        </div>
        <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>🤖</div>
          <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e3a8a" }}>AI Evaluation</h4>
          <p style={{ fontSize: "0.78rem", color: "#64748b" }}>GPT-4o subjective first-pass scoring.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
        <Link href="/login" className="btn btn-primary" style={{ fontSize: "1rem" }}>
          Sign In to Portal →
        </Link>
        <Link href="/register" className="btn" style={{
          background: "#ffffff",
          color: "var(--primary-indigo)",
          border: "1.5px solid var(--border-glass)",
          fontSize: "1rem"
        }}>
          Register Account
        </Link>
      </div>
    </div>
  );
}
