"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTranslation, SupportedLocale, SUPPORTED_LOCALES } from "@/lib/i18n";

interface LanguageSwitcherProps {
  variant?: "dropdown" | "pills";
  className?: string;
}

export default function LanguageSwitcher({
  variant = "dropdown",
  className = "",
}: LanguageSwitcherProps) {
  const { locale, setLocale, currentMeta } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (variant === "pills") {
    return (
      <div
        role="radiogroup"
        aria-label="Language selection"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.4rem",
          justifyContent: "center",
        }}
        className={className}
      >
        {SUPPORTED_LOCALES.map((lang) => {
          const isSelected = locale === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setLocale(lang.code)}
              style={{
                background: isSelected ? "rgba(46, 90, 172, 0.25)" : "rgba(255, 255, 255, 0.05)",
                border: isSelected
                  ? "1px solid rgba(46, 90, 172, 0.65)"
                  : "1px solid rgba(255, 255, 255, 0.12)",
                color: isSelected ? "#38bdf8" : "var(--text-muted)",
                padding: "0.3rem 0.65rem",
                borderRadius: "8px",
                fontSize: "0.78rem",
                fontWeight: isSelected ? 700 : 500,
                cursor: "pointer",
                transition: "all 140ms ease",
              }}
              title={lang.name}
            >
              {lang.nativeName}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={dropdownRef}
      style={{ position: "relative", display: "inline-block" }}
      className={className}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select platform language"
        className="nav-link-item"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.35rem 0.65rem",
          borderRadius: "8px",
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          color: "var(--text-muted)",
          cursor: "pointer",
          fontSize: "0.78rem",
          fontWeight: 600,
          transition: "all 140ms ease",
        }}
      >
        <span>🌐</span>
        <span style={{ color: "#FFFFFF" }}>{currentMeta.nativeName}</span>
        <span style={{ fontSize: "0.6rem", opacity: 0.7 }}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Languages"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 1000,
            minWidth: "160px",
            background: "#12172B",
            border: "1px solid rgba(46, 90, 172, 0.4)",
            borderRadius: "10px",
            padding: "0.35rem",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(12px)",
          }}
        >
          {SUPPORTED_LOCALES.map((lang) => {
            const isSelected = locale === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setLocale(lang.code);
                  setIsOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "0.45rem 0.65rem",
                  borderRadius: "6px",
                  border: "none",
                  background: isSelected ? "rgba(46, 90, 172, 0.3)" : "transparent",
                  color: isSelected ? "#38bdf8" : "#E2E8F0",
                  fontSize: "0.82rem",
                  fontWeight: isSelected ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 100ms ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                <span>{lang.nativeName}</span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  {lang.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
