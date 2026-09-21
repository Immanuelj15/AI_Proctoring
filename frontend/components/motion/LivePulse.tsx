"use client";

// Gentle ambient breathing pulse to distinguish real-time active system telemetry from static mockup data.
import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export type PulseColor = "sage" | "amber" | "coral" | "blue";

interface LivePulseProps {
  color?: PulseColor;
  label?: string;
  size?: number;
  className?: string;
}

export default function LivePulse({
  color = "sage",
  label,
  size = 8,
  className = "",
}: LivePulseProps) {
  const shouldReduceMotion = useReducedMotion();

  const colorMap: Record<PulseColor, { dot: string; glow: string }> = {
    sage: { dot: "var(--color-sage, #3E8067)", glow: "rgba(62, 128, 103, 0.4)" },
    amber: { dot: "var(--color-amber, #D98E29)", glow: "rgba(217, 142, 41, 0.4)" },
    coral: { dot: "var(--color-coral, #C4483C)", glow: "rgba(196, 72, 60, 0.4)" },
    blue: { dot: "var(--color-signal-blue, #2E5AAC)", glow: "rgba(46, 90, 172, 0.4)" },
  };

  const selected = colorMap[color];

  return (
    <span
      className={`live-pulse-container ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45rem",
        verticalAlign: "middle",
      }}
    >
      <span
        style={{
          position: "relative",
          width: `${size}px`,
          height: `${size}px`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Breathing Halo */}
        {!shouldReduceMotion && (
          <motion.span
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.7, 0, 0.7],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              backgroundColor: selected.glow,
            }}
          />
        )}

        {/* Solid Core Dot */}
        <span
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: "50%",
            backgroundColor: selected.dot,
            display: "inline-block",
            boxShadow: `0 0 6px ${selected.glow}`,
          }}
        />
      </span>

      {label && (
        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary, #cbd5e1)" }}>
          {label}
        </span>
      )}
    </span>
  );
}
