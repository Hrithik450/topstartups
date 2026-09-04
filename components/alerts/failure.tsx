"use client";

import React from "react";
import { CircleX } from "lucide-react";

type FailureAlertProps = {
  message: string;
  duration?: number;
  setMessage?: (message: string | null) => void;
  setStatus?: (status: "error" | "saving" | "saved" | null) => void;
};

export const FailureAlert = ({
  message,
  duration = 4000,
  setMessage,
  setStatus,
}: FailureAlertProps) => {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (setMessage !== undefined) setMessage(null);
      if (setStatus !== undefined) setStatus(null);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, setMessage, setStatus]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 99999,
        maxWidth: "92vw",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          backgroundColor: "#2a0d12",
          color: "#fca5a5",
          border: "1px solid rgba(248, 113, 113, 0.4)",
          borderRadius: "12px",
          padding: "12px 18px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(8px)",
          fontWeight: 600,
          fontSize: "14px",
          lineHeight: "1.4",
        }}
      >
        <CircleX style={{ width: "20px", height: "20px", color: "#f87171", flexShrink: 0 }} />
        <span>{message}</span>
      </div>
    </div>
  );
};
