import React from "react";

interface LoadingProps {
  message?: string;
}

export default function Loading({ message = "Loading..." }: LoadingProps) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "3rem",
      color: "var(--primary-navy, #1e3a8a)",
    }}>
      <div style={{
        width: "40px",
        height: "40px",
        border: "4px solid rgba(37, 99, 235, 0.2)",
        borderTop: "4px solid #2563eb",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        marginBottom: "1rem"
      }} />
      <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>{message}</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
