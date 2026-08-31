"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/api";
import { UserRole } from "@/lib/types";

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      await registerUser({ name, email, password, role });
      setSuccess("Account created successfully! Redirecting to sign in...");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "An account with this email already exists.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="card-header">
        <h2 className="card-title">Create Account</h2>
        <p className="card-description">Register a new candidate or examiner account.</p>
      </div>

      {error && (
        <div className="alert-banner error" role="alert">
          <span>⚠️</span> {error}
        </div>
      )}

      {success && (
        <div className="alert-banner success" role="alert">
          <span>✓</span> {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="name">Full Name</label>
          <input
            id="name"
            type="text"
            className="form-input"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            className="form-input"
            placeholder="john@example.com"
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
            placeholder="Minimum 6 characters"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Select Account Role</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
            {[
              { id: "student", label: "🎓 Student" },
              { id: "examiner", label: "📝 Examiner" },
              { id: "admin", label: "🔑 Admin" },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                className={`tab-btn ${role === r.id ? "active" : ""}`}
                onClick={() => setRole(r.id as UserRole)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ marginTop: "1rem" }}
        >
          {loading ? "[ Creating Account... ]" : "Register Account"}
        </button>
      </form>

      <div className="card-footer">
        <p>
          Already have an account?{" "}
          <Link href="/login" className="auth-link">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
