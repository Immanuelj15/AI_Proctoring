import Link from "next/link";
import { MotionPage, StaggerList, StaggerItem } from "@/components/motion";

export default function GeneralLoginPage() {
  return (
    <MotionPage>
      <div className="auth-card" style={{ maxWidth: "640px", textAlign: "center" }}>
        <div className="card-header">
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🛡️</div>
          <h2 className="card-title" style={{ fontSize: "1.75rem" }}>
            Select Authentication Portal
          </h2>
          <p className="card-description">
            Choose your authorized role to access the Zero-Trust Examination Platform.
          </p>
        </div>

        <StaggerList
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", margin: "2rem 0" }}
        >
          {/* Student Portal Card */}
          <StaggerItem>
            <Link href="/student/login" style={{ textDecoration: "none" }}>
              <div style={{
                padding: "1.5rem 1rem",
                background: "rgba(6, 182, 212, 0.06)",
                border: "1px solid rgba(6, 182, 212, 0.35)",
                borderRadius: "14px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.6rem",
                backdropFilter: "blur(10px)"
              }}
              className="portal-select-card interactive-card"
              >
                <div style={{ fontSize: "2.2rem" }}>🎓</div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#38bdf8" }}>Candidate Portal</h4>
                <p style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>DBMS & Live Tests</p>
              </div>
            </Link>
          </StaggerItem>

          {/* Examiner Portal Card */}
          <StaggerItem>
            <Link href="/examiner/login" style={{ textDecoration: "none" }}>
              <div style={{
                padding: "1.5rem 1rem",
                background: "rgba(139, 92, 246, 0.06)",
                border: "1px solid rgba(139, 92, 246, 0.35)",
                borderRadius: "14px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.6rem",
                backdropFilter: "blur(10px)"
              }}
              className="portal-select-card interactive-card"
              >
                <div style={{ fontSize: "2.2rem" }}>📝</div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#c084fc" }}>Examiner Hub</h4>
                <p style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Grading & Questions</p>
              </div>
            </Link>
          </StaggerItem>

          {/* Admin Portal Card */}
          <StaggerItem>
            <Link href="/admin/login" style={{ textDecoration: "none" }}>
              <div style={{
                padding: "1.5rem 1rem",
                background: "rgba(245, 158, 11, 0.06)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                borderRadius: "14px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.6rem",
                backdropFilter: "blur(10px)"
              }}
              className="portal-select-card interactive-card"
              >
                <div style={{ fontSize: "2.2rem" }}>🔒</div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#fbbf24" }}>Admin Console</h4>
                <p style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>User Approvals & Config</p>
              </div>
            </Link>
          </StaggerItem>
        </StaggerList>

        <div className="card-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
          <Link href="/" className="auth-link" style={{ color: "var(--text-muted)" }}>
            ← Back to Overview
          </Link>
          <Link href="/register" className="auth-link">
            Register New Account →
          </Link>
        </div>
      </div>
    </MotionPage>
  );
}
