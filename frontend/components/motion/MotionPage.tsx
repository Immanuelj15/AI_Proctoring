"use client";

// Route change fade/slide transition (~250ms) to ensure smooth wayfinding without obstructing quick navigation.
import React from "react";
import { motion, useReducedMotion } from "framer-motion";

interface MotionPageProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function MotionPage({ children, className = "", style = {} }: MotionPageProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
      transition={{
        duration: shouldReduceMotion ? 0.001 : 0.25,
        ease: [0.16, 1, 0.3, 1] as const, // ease-out curve
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
