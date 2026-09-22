"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { SegmentedTabs, Button } from "@/components/motion";
import { useTranslation } from "@/lib/i18n";

export default function LoginForm() {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"student" | "examiner" | "admin">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const roleTabs = [
    { id: "student" as const, label: t("auth.roleStudent"), icon: "🎓" },
    { id: "examiner" as const, label: t("auth.roleExaminer"), icon: "📝" },
    { id: "admin" as const, label: t("auth.roleAdmin"), icon: "🔑" },
  ];

  const handleRoleChange = (role: "student" | "examiner" | "admin") => {
    setActiveTab(role);
    setEmail("");
    setPassword("");
  };

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
      setError(t("auth.allFieldsRequired"));
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
        <h2 className="card-title">{t("auth.portalSignIn")}</h2>
        <p className="card-description">{t("auth.portalSignInDesc")}</p>
      </div>

      {/* Role Selection Tabs with Shared Layout Sliding Pill */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
        <SegmentedTabs<"student" | "examiner" | "admin">
          tabs={roleTabs}
          activeId={activeTab}
          onChange={handleRoleChange}
          layoutId="login-role-pill"
        />
      </div>

      {/* Quick Fill Bar for Instant Testing */}
      <div className="quick-fill-bar">
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>
          ⚡ {t("auth.quickFill")}
        </span>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button type="button" className="quick-btn" onClick={() => handleQuickFill("student")}>
            {t("auth.roleStudent")}
          </button>
          <button type="button" className="quick-btn" onClick={() => handleQuickFill("examiner")}>
            {t("auth.roleExaminer")}
          </button>
          <button type="button" className="quick-btn" onClick={() => handleQuickFill("admin")}>
            {t("auth.roleAdmin")}
          </button>
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
            {t("auth.email")}
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
          <label className="form-label" htmlFor="password">
            {t("auth.password")}
          </label>
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

        <Button
          type="submit"
          variant="primary"
          isLoading={loading}
          style={{ width: "100%", padding: "0.75rem" }}
        >
          {loading ? t("auth.signingIn") : t("auth.signInButton")}
        </Button>
      </form>

      <div className="card-footer">
        <p>
          {t("auth.dontHaveAccount")}{" "}
          <Link href="/register" className="auth-link">
            {t("auth.registerLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
