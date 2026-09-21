"use client";

// Modal dialog scale/fade choreography with asymmetric timing (240ms enter, 140ms exit) for swift feedback.
import React, { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export default function AnimatedModal({
  isOpen,
  onClose,
  children,
  maxWidth = "560px",
  className = "",
}: AnimatedModalProps) {
  const shouldReduceMotion = useReducedMotion();

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          {/* Backdrop Fade: 200ms in, 140ms out */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0.001 : 0.2,
              ease: "easeOut",
            }}
            onClick={onClose}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(18, 23, 43, 0.85)",
              backdropFilter: "blur(12px)",
            }}
          />

          {/* Modal Panel: Scale 0.95 -> 1 with vertical settle (240ms enter, 140ms exit) */}
          <motion.div
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.95, y: 10 }
            }
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: {
                duration: shouldReduceMotion ? 0.001 : 0.24,
                ease: [0.16, 1, 0.3, 1] as const, // ease-out
              },
            }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    scale: 0.96,
                    y: 6,
                    transition: {
                      duration: shouldReduceMotion ? 0.001 : 0.14,
                      ease: [0.7, 0, 0.84, 0] as const, // ease-in for faster exit
                    },
                  }
            }
            style={{
              position: "relative",
              width: "100%",
              maxWidth,
              zIndex: 1,
            }}
            className={className}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
