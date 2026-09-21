"use client";

// Staggered card list entrance (~50ms offset, 8px vertical settle) for organic visual hierarchy upon data arrival.
import React from "react";
import { motion, useReducedMotion } from "framer-motion";

interface StaggerListProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  staggerDelay?: number;
}

export function StaggerList({
  children,
  className = "",
  style = {},
  staggerDelay = 0.05,
}: StaggerListProps) {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: shouldReduceMotion ? 1 : 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : staggerDelay,
        delayChildren: shouldReduceMotion ? 0 : 0.04,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function StaggerItem({ children, className = "", style = {} }: StaggerItemProps) {
  const shouldReduceMotion = useReducedMotion();

  const itemVariants = {
    hidden: {
      opacity: shouldReduceMotion ? 1 : 0,
      y: shouldReduceMotion ? 0 : 8,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.001 : 0.24,
        ease: [0.16, 1, 0.3, 1] as const, // ease-out
      },
    },
  };

  return (
    <motion.div variants={itemVariants} className={className} style={style}>
      {children}
    </motion.div>
  );
}
