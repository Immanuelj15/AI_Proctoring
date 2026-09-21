"use client";

// Animated numeric count-up from 0 on initial mount to draw eye toward key quantitative milestones.
import React, { useState, useEffect } from "react";
import { useReducedMotion } from "framer-motion";

interface CountUpProps {
  value: number;
  durationMs?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export default function CountUp({
  value,
  durationMs = 700,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: CountUpProps) {
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<number>(shouldReduceMotion ? value : 0);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }

    let startTime: number | null = null;
    let animationFrameId: number;

    const startVal = 0;
    const endVal = value;

    const easeOutQuad = (t: number): number => t * (2 - t);

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = easeOutQuad(progress);

      const current = startVal + (endVal - startVal) * easedProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [value, durationMs, shouldReduceMotion]);

  const formattedValue = decimals > 0
    ? displayValue.toFixed(decimals)
    : Math.round(displayValue).toString();

  return (
    <span className={className} style={{ fontFamily: "var(--font-mono, monospace)" }}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
}
