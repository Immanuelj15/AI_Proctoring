import Link from "next/link";

export default function GeneralLoginPage() {
  return (
    <div className="auth-card" style={{ maxWidth: "600px", textAlign: "center" }}>
      <div className="card-header">
        <h2 className="card-title" style={{ fontSize: "1.75rem" }}>
          Select Authentication Portal
        </h2>
        <p className="card-description">
          Please select your user role to access your dedicated portal.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", margin: "1.75rem 0" }}>
        {/* Student Portal Card */}
        <Link href="/student/login" style={{ textDecoration: "none" }}>
          <div style={{
            padding: "1.25rem 1rem",
            background: "#eff6ff",
            border: "1.5px solid #bfdbfe",
            borderRadius: "14px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            transition: "all 0.2s ease"
          }}>
            <div style={{ fontSize: "2rem" }}>🎓</div>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#1d4ed8" }}>Student Portal</h4>
            <p style={{ fontSize: "0.75rem", color: "#3b82f6" }}>Candidate Exam Room</p>
          </div>
        </Link>

        {/* Examiner Portal Card */}
        <Link href="/examiner/login" style={{ textDecoration: "none" }}>
          <div style={{
            padding: "1.25rem 1rem",
            background: "#f0fdf4",
            border: "1.5px solid #bbf7d0",
            borderRadius: "14px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            transition: "all 0.2s ease"
          }}>
            <div style={{ fontSize: "2rem" }}>📝</div>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#15803d" }}>Examiner Hub</h4>
            <p style={{ fontSize: "0.75rem", color: "#22c55e" }}>Questions & Grading</p>
          </div>
        </Link>

        {/* Admin Portal Card */}
        <Link href="/admin/login" style={{ textDecoration: "none" }}>
          <div style={{
            padding: "1.25rem 1rem",
            background: "#faf5ff",
            border: "1.5px solid #e9d5ff",
            borderRadius: "14px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            transition: "all 0.2s ease"
          }}>
            <div style={{ fontSize: "2rem" }}>🔒</div>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#7e22ce" }}>Admin Portal</h4>
            <p style={{ fontSize: "0.75rem", color: "#a855f7" }}>System Management</p>
          </div>
        </Link>
      </div>

      <div className="card-footer">
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="auth-link">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
