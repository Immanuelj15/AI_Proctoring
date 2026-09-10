"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getToken, removeToken, setToken } from "@/lib/auth";
import { loginUser, getCurrentUser } from "@/lib/api";

export default function Header() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isDemoLoading, setIsDemoLoading] = useState<string | null>(null);

  useEffect(() => {
    async function checkUser() {
      const token = getToken();
      if (token) {
        try {
          const userRaw = localStorage.getItem("user");
          if (userRaw) {
            setCurrentUser(JSON.parse(userRaw));
          } else {
            const u = await getCurrentUser(token);
            setCurrentUser(u);
            localStorage.setItem("user", JSON.stringify(u));
          }
        } catch (e) {
          // Token expired or invalid
          removeToken();
          localStorage.removeItem("user");
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    }
    checkUser();
  }, []);

  const handleQuickDemoLogin = async (role: "student" | "examiner" | "admin", targetUrl: string) => {
    setIsDemoLoading(role);
    try {
      let email = "student@example.com";
      let password = "StudentPassword123!";

      if (role === "examiner") {
        email = "examiner@example.com";
        password = "ExaminerPassword123!";
      } else if (role === "admin") {
        email = "admin@example.com";
        password = "AdminPassword123!";
      }

      const res = await loginUser({ email, password });
      setToken(res.access_token);
      
      const user = await getCurrentUser(res.access_token);
      localStorage.setItem("user", JSON.stringify(user));
      setCurrentUser(user);

      router.push(targetUrl);
    } catch (err: any) {
      alert(`Demo quick-login error: ${err.message || "Failed to authenticate"}`);
    } finally {
      setIsDemoLoading(null);
    }
  };

  const handleLogout = () => {
    removeToken();
    localStorage.removeItem("user");
    setCurrentUser(null);
    router.push("/login");
  };

  return (
    <header className="app-header">
      {/* Brand Logo & Telemetry Indicator */}
      <Link href="/" className="header-brand">
        <div className="logo-icon">AI</div>
        <div>
          <h1 className="header-title">AI Proctor Examination Platform</h1>
          <p className="header-subtitle">
            <span className="pulse-dot pulse-dot-green" style={{ display: "inline-block", marginRight: "4px" }} />
            Zero-Trust Proctoring Engine Active
          </p>
        </div>
      </Link>

      {/* Instant Demo Switcher Bar */}
      <div className="demo-quick-bar">
        <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, paddingLeft: "0.4rem" }}>
          Instant Demo:
        </span>
        <button
          onClick={() => handleQuickDemoLogin("student", "/exam/1")}
          disabled={!!isDemoLoading}
          className="demo-pill-btn demo-pill-student"
          title="Instantly launch candidate room with DBMS Exam"
        >
          {isDemoLoading === "student" ? "Connecting..." : "⚡ Student Exam"}
        </button>
        <button
          onClick={() => handleQuickDemoLogin("examiner", "/proctor-live")}
          disabled={!!isDemoLoading}
          className="demo-pill-btn demo-pill-examiner"
          title="Open real-time candidate video wall & telemetry"
        >
          {isDemoLoading === "examiner" ? "Connecting..." : "👁️ Live Surveillance"}
        </button>
        <button
          onClick={() => handleQuickDemoLogin("examiner", "/grading")}
          disabled={!!isDemoLoading}
          className="demo-pill-btn demo-pill-grading"
          title="Open examiner dual-track evaluation workbench"
        >
          {isDemoLoading === "examiner" ? "Connecting..." : "📝 Grading Hub"}
        </button>
        <button
          onClick={() => handleQuickDemoLogin("admin", "/dashboard")}
          disabled={!!isDemoLoading}
          className="demo-pill-btn"
          style={{ color: "#38bdf8" }}
          title="Open admin console for question bank and approvals"
        >
          {isDemoLoading === "admin" ? "Connecting..." : "⚙️ Admin"}
        </button>
      </div>

      {/* Navigation Links & User Profile */}
      <nav className="nav-links">
        <Link href="/" className="nav-link-item">
          Overview
        </Link>
        <Link href="/dashboard" className="nav-link-item">
          Dashboard
        </Link>
        <Link href="/proctor-live" className="nav-link-item">
          Monitoring
        </Link>
        <Link href="/grading" className="nav-link-item">
          Evaluation
        </Link>

        {currentUser ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginLeft: "0.5rem" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fff" }}>
                {currentUser.name}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--primary-cyan)", textTransform: "uppercase", fontWeight: 600 }}>
                {currentUser.role}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn-ghost"
              style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link href="/login" className="nav-link-item btn-nav-login">
            🔐 Sign In
          </Link>
        )}
      </nav>
    </header>
  );
}
