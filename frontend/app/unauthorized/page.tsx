import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="auth-card" style={{ textAlign: "center" }}>
      <div className="card-header">
        <h2 className="card-title" style={{ color: "var(--status-error)" }}>
          403 — Unauthorized Access
        </h2>
        <p className="card-description" style={{ marginTop: "0.5rem" }}>
          You do not have permission to access this resource with your current role.
        </p>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <Link href="/login" className="btn btn-primary">
          Return to Login
        </Link>
      </div>
    </div>
  );
}
