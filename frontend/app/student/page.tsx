"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

export default function StudentPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (token) {
      router.replace("/dashboard");
    } else {
      router.replace("/student/login");
    }
  }, [router]);

  return (
    <div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="pulse-dot pulse-dot-cyan" />
      <span style={{ marginLeft: "0.75rem", color: "var(--text-muted)" }}>Redirecting to Student Portal...</span>
    </div>
  );
}
