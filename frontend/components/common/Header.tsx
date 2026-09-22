"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { getToken, removeToken, setToken } from "@/lib/auth";
import { loginUser, getCurrentUser } from "@/lib/api";
import { LivePulse } from "@/components/motion";
import { useTranslation } from "@/lib/i18n";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import PushNotificationToggle from "@/components/pwa/PushNotificationToggle";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const { t } = useTranslation();
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

  const navItems = [
    { href: "/", label: t("nav.overview") },
    { href: "/dashboard", label: t("nav.dashboard") },
    { href: "/proctor-live", label: t("nav.monitoring") },
    { href: "/grading", label: t("nav.evaluation") },
  ];

  return (
    <header className="app-header">
      {/* Brand Logo & Telemetry Indicator */}
      <Link href="/" className="header-brand">
        <div className="logo-icon">AI</div>
        <div>
          <h1 className="header-title">{t("brand.title")}</h1>
          <div className="header-subtitle" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <LivePulse color="sage" label={t("brand.tagline")} />
          </div>
        </div>
      </Link>

      {/* Instant Demo Switcher Bar */}
      <div className="demo-quick-bar">
        <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, paddingLeft: "0.4rem" }}>
          {t("nav.demoTitle")}
        </span>
        <button
          onClick={() => handleQuickDemoLogin("student", "/exam/1")}
          disabled={!!isDemoLoading}
          className="demo-pill-btn demo-pill-student"
          title="Instantly launch candidate room with DBMS Exam"
        >
          {isDemoLoading === "student" ? "Connecting..." : t("nav.demoStudent")}
        </button>
        <button
          onClick={() => handleQuickDemoLogin("examiner", "/proctor-live")}
          disabled={!!isDemoLoading}
          className="demo-pill-btn demo-pill-examiner"
          title="Open real-time candidate video wall & telemetry"
        >
          {isDemoLoading === "examiner" ? "Connecting..." : t("nav.demoSurveillance")}
        </button>
        <button
          onClick={() => handleQuickDemoLogin("examiner", "/grading")}
          disabled={!!isDemoLoading}
          className="demo-pill-btn demo-pill-grading"
          title="Open examiner dual-track evaluation workbench"
        >
          {isDemoLoading === "examiner" ? "Connecting..." : t("nav.demoGrading")}
        </button>
        <button
          onClick={() => handleQuickDemoLogin("admin", "/dashboard")}
          disabled={!!isDemoLoading}
          className="demo-pill-btn"
          style={{ color: "#38bdf8" }}
          title="Open admin console for question bank and approvals"
        >
          {isDemoLoading === "admin" ? "Connecting..." : t("nav.demoAdmin")}
        </button>
      </div>

      {/* Navigation Links with Shared Layout Gliding Indicator & Utilities */}
      <nav className="nav-links" style={{ position: "relative", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link-item ${isActive ? "active" : ""}`}
              style={{
                position: "relative",
                color: isActive ? "#ffffff" : "var(--text-muted)",
                transition: "color 150ms ease",
              }}
            >
              {/* Shared layout sliding pill */}
              {isActive && (
                <motion.span
                  layoutId="header-active-nav-indicator"
                  transition={
                    shouldReduceMotion
                      ? { duration: 0.001 }
                      : { type: "spring", stiffness: 450, damping: 35 }
                  }
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "8px",
                    background: "rgba(46, 90, 172, 0.28)",
                    border: "1px solid rgba(46, 90, 172, 0.55)",
                    zIndex: -1,
                  }}
                />
              )}
              {item.label}
            </Link>
          );
        })}

        {/* Multilingual Switcher Dropdown */}
        <LanguageSwitcher variant="dropdown" />

        {/* PWA Push Notification Reminder Toggle (Compact) */}
        <PushNotificationToggle userId={currentUser?.id} compact={true} />

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
              {t("nav.signOut")}
            </button>
          </div>
        ) : (
          <Link href="/login" className="nav-link-item btn-nav-login">
            🔐 {t("nav.signIn")}
          </Link>
        )}
      </nav>
    </header>
  );
}
