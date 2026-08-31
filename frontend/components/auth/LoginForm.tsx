"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function LoginForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"student" | "examiner" | "admin">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleQuickFill = (role: "student" | "examiner" | "admin") => {
    setActiveTab(role);
    if (role === "student") {
      setEmail("student@example.com");
      setPassword("StudentPassword123!");
    } else if (role === "examiner") {
      setEmail("examiner@example.com");
      setPassword("ExaminerPassword123!");
    } else if (role === "admin") {
      setEmail("admin@example.com");
      setPassword("AdminPassword123!");
    }
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
    <div className="auth-card">
      <div className="card-header">
        <h2 className="card-title">Portal Sign In</h2>
        <p className="card-description">Select your role to access the AI Examination Platform.</p>
      </div>

      {/* Role Selection Tabs */}
      <div className="tab-group">
        <button
          className={`tab-btn ${activeTab === "student" ? "active" : ""}`}
          onClick={() => { setActiveTab("student"); setEmail(""); setPassword(""); }}
        >
          🎓 Student
        </button>
        <button
          className={`tab-btn ${activeTab === "examiner" ? "active" : ""}`}
          onClick={() => { setActiveTab("examiner"); setEmail(""); setPassword(""); }}
        >
          📝 Examiner
        </button>
        <button
          className={`tab-btn ${activeTab === "admin" ? "active" : ""}`}
          onClick={() => { setActiveTab("admin"); setEmail(""); setPassword(""); }}
        >
          🔑 Admin
        </button>
      </div>

      {/* Quick Fill Bar for Instant Testing */}
      <div className="quick-fill-bar">
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>⚡ Quick Fill:</span>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button type="button" className="quick-btn" onClick={() => handleQuickFill("student")}>Student</button>
          <button type="button" className="quick-btn" onClick={() => handleQuickFill("examiner")}>Examiner</button>
          <button type="button" className="quick-btn" onClick={() => handleQuickFill("admin")}>Admin</button>
        </div>
      </div>

      {error && (
        <div className="alert-banner error" role="alert">
          <span>⚠️</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="email">
            {activeTab.toUpperCase()} Email Address
          </label>
          <input
            id="email"
            type="email"
            className="form-input"
            placeholder={`${activeTab}@example.com`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">Password</label>
          <input
            id="password"
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
        >
          {loading ? "[ Authenticating... ]" : `Sign In as ${activeTab.toUpperCase()}`}
        </button>
      </form>

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
