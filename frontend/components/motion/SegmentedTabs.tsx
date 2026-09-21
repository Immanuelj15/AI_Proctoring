"use client";

// Shared layout sliding indicator pill with spring physics to clearly communicate current spatial context.
import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export interface TabOption<T extends string = string> {
  id: T;
  label: string | React.ReactNode;
  icon?: string;
  badge?: string | number;
}

interface SegmentedTabsProps<T extends string = string> {
  tabs: TabOption<T>[];
  activeId: T;
  onChange: (id: T) => void;
  layoutId?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function SegmentedTabs<T extends string = string>({
  tabs,
  activeId,
  onChange,
  layoutId = "segmented-tab-indicator",
  className = "",
  style = {},
}: SegmentedTabsProps<T>) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      role="tablist"
      className={`segmented-control-container ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px",
        background: "rgba(18, 23, 43, 0.75)",
        border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
        borderRadius: "12px",
        position: "relative",
        gap: "4px",
        ...style,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              position: "relative",
              padding: "0.55rem 1.15rem",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              color: isActive ? "#ffffff" : "var(--text-muted, #94a3b8)",
              fontSize: "0.85rem",
              fontWeight: isActive ? 700 : 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              zIndex: 1,
              transition: "color 150ms ease",
              outline: "none",
            }}
            className="segmented-tab-btn"
          >
            {/* Sliding Active Indicator Pill */}
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={
                  shouldReduceMotion
                    ? { duration: 0.001 }
                    : { type: "spring", stiffness: 450, damping: 35 }
                }
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "var(--color-signal-blue, #2E5AAC)",
                  borderRadius: "8px",
                  zIndex: -1,
                  boxShadow: "0 2px 8px rgba(46, 90, 172, 0.4)",
                }}
              />
            )}

            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                style={{
                  padding: "0.15rem 0.45rem",
                  fontSize: "0.7rem",
                  borderRadius: "9999px",
                  background: isActive ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.08)",
                  fontWeight: 600,
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
