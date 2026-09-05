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
      <div className="global-toast-alert success" role="status">
        <CircleCheck />
        <span>{message}</span>
      </div>
    </div>
  );
};