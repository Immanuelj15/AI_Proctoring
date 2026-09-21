"use client";

// Consistent press-scale micro-interaction (scale 0.97, 100ms) providing tactile physical feedback on interaction.
import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export type ButtonVariant = "primary" | "secondary" | "danger" | "outline" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export default function Button({
  variant = "primary",
  children,
  icon,
  isLoading = false,
  disabled,
  className = "",
  style = {},
  ...props
}: ButtonProps) {
  const shouldReduceMotion = useReducedMotion();

  const getVariantClass = (v: ButtonVariant): string => {
    switch (v) {
      case "primary":
        return "btn btn-primary";
      case "secondary":
        return "btn btn-secondary";
      case "danger":
        return "btn btn-danger";
      case "outline":
        return "btn btn-outline";
      case "ghost":
        return "btn-ghost";
      default:
        return "btn btn-primary";
    }
  };

  return (
    <motion.button
      whileTap={
        shouldReduceMotion || disabled || isLoading
          ? undefined
          : { scale: 0.97 }
      }
      transition={{ duration: 0.1, ease: "easeOut" }}
      disabled={disabled || isLoading}
      className={`${getVariantClass(variant)} ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        cursor: disabled || isLoading ? "not-allowed" : "pointer",
        outline: "none",
        ...style,
      }}
      {...(props as any)}
    >
      {isLoading ? (
        <>
          <span
            className="spinner-dot"
            style={{
              width: "14px",
              height: "14px",
              border: "2px solid currentColor",
              borderTopColor: "transparent",
              borderRadius: "50%",
              display: "inline-block",
              animation: "spin 0.6s linear infinite",
            }}
          />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {icon && <span aria-hidden="true">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </motion.button>
  );
}
