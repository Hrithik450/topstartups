"use client";

import { useEffect, useState } from "react";

export default function BuildingLoader({ isLoading }: { isLoading: boolean }) {
  const [stage, setStage] = useState(0);
  const [shouldRender, setShouldRender] = useState(true);

  // Cycle loading status text
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 500);
    const t2 = setTimeout(() => setStage(2), 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Graceful unmount after fade-out transition
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setShouldRender(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!shouldRender) return null;

  const messages = [
    "Loading 3D Skyscraper...",
    "Connecting Live Attention Market...",
    "Ready...",
  ];

  return (
    <div
      className={`building-loader-overlay ${!isLoading ? "fade-out" : ""}`}
      aria-label="Loading GeTopFloor"
      role="status"
    >
      <div className="building-loader-card">
        {/* User's Official Logo */}
        <div className="building-loader-logo-wrap">
          <img
            src="/logo.png"
            alt="GeTopFloor"
            className="building-loader-logo"
            width={110}
            height={110}
          />
        </div>

        {/* Status Message */}
        <p className="building-loader-message">{messages[stage]}</p>

        {/* Progress Bar */}
        <div className="building-loader-bar-track">
          <div className="building-loader-bar-fill" />
        </div>
      </div>
    </div>
  );
}
