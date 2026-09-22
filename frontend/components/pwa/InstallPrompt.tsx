"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already running as installed standalone PWA
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes("android-app://");
      setIsStandalone(Boolean(isStandaloneMode));
    };
    checkStandalone();

    // Check if user recently dismissed the prompt
    const dismissedUntil = localStorage.getItem("pwa_install_dismissed_until");
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser's native banner
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show native installation prompt dialog
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setIsVisible(false);
      setDeferredPrompt(null);
    } else {
      // Dismissed: silence for 24 hours
      dismissFor24Hours();
    }
  };

  const dismissFor24Hours = () => {
    setIsVisible(false);
    localStorage.setItem(
      "pwa_install_dismissed_until",
      (Date.now() + 24 * 60 * 60 * 1000).toString()
    );
  };

  if (!isVisible || isStandalone) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="App Installation Prompt"
      style={{
        position: "fixed",
        bottom: "1.25rem",
        right: "1.25rem",
        zIndex: 9999,
        maxWidth: "380px",
        width: "calc(100% - 2.5rem)",
        background: "#12172B",
        color: "#F5F6F8",
        border: "1px solid rgba(46, 90, 172, 0.4)",
        borderRadius: "14px",
        padding: "1rem 1.15rem",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.45)",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
        animation: "slideInUp 250ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <img
          src="/icons/icon-192.png"
          alt="AI Proctor Icon"
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "10px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.2 }}>
            Install AI Proctor
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Add to desktop or home screen for secure fullscreen examination.
          </div>
        </div>
        <button
          onClick={dismissFor24Hours}
          aria-label="Dismiss installation prompt"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "1.1rem",
            cursor: "pointer",
            padding: "0.2rem",
            lineHeight: 1,
          }}
        >
          &times;
        </button>
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={handleInstallClick}
          style={{
            flex: 1,
            background: "#2E5AAC",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "8px",
            padding: "0.5rem 0.85rem",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
            transition: "background 140ms ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#24488A")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#2E5AAC")}
        >
          ⬇️ Install App
        </button>
        <button
          onClick={dismissFor24Hours}
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            color: "#CBD5E1",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "8px",
            padding: "0.5rem 0.85rem",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
}
