"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleQuickFill = () => {
    setEmail("admin@example.com");
    setPassword("AdminPassword123!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const response = await loginUser({ email, password });
      setToken(response.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card" style={{ maxWidth: "460px" }}>
      <div className="card-header">
        <span className="badge badge-admin" style={{ fontSize: "0.8rem", marginBottom: "0.5rem" }}>
          System Administration
        </span>
        <h2 className="card-title">🔒 Administrator Sign In</h2>
        <p className="card-description">System configuration, security logs & user role control.</p>
      </div>

      {/* Quick Fill Button */}
      <div className="quick-fill-bar">
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>⚡ Quick Fill Demo:</span>
        <button type="button" className="quick-btn" onClick={handleQuickFill}>
          admin@example.com
        </button>
      </div>

      {error && (
        <div className="alert-banner error" role="alert">
          <span>⚠️</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="admin-email">
            Administrator Email Address
          </label>
          <input
            id="admin-email"
            type="email"
            className="form-input"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            className="form-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ marginTop: "0.5rem", background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
        >
          {loading ? "[ Authenticating... ]" : "Sign In to Admin Portal →"}
        </button>
      </form>

      <div className="card-footer" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
        <Link href="/examiner/login" style={{ color: "#64748b", textDecoration: "none", fontWeight: 600 }}>
          ← Examiner Login
        </Link>
        <Link href="/student/login" style={{ color: "#64748b", textDecoration: "none", fontWeight: 600 }}>
          Student Login →
        </Link>
      </div>
    </div>
  );
}
