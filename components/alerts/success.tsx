"use client";

import React from "react";
import { CircleCheck } from "lucide-react";

type SuccessAlertProps = {
  message: string;
  duration?: number;
  setMessage?: (message: string | null) => void;
  setStatus?: (status: "error" | "saving" | "saved" | null) => void;
};

export const SuccessAlert = ({
  message,
  duration = 4000,
  setMessage,
  setStatus,
}: SuccessAlertProps) => {
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
          backgroundColor: "#0d2818",
          color: "#86efac",
          border: "1px solid rgba(74, 222, 128, 0.4)",
          borderRadius: "12px",
          padding: "12px 18px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(8px)",
          fontWeight: 600,
          fontSize: "14px",
          lineHeight: "1.4",
        }}
      >
        <CircleCheck style={{ width: "20px", height: "20px", color: "#4ade80", flexShrink: 0 }} />
        <span>{message}</span>
      </div>
    </div>
  );
};