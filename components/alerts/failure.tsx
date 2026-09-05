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
      <div className="global-toast-alert failure" role="alert">
        <CircleX />
        <span>{message}</span>
      </div>
    </div>
  );
};
