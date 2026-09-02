"use client";

import { useEffect, useState } from "react";

export default function BuildingLoader({ isLoading }: { isLoading: boolean }) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [stage, setStage] = useState(0);
  const [shouldRender, setShouldRender] = useState(true);

  // Guarantee branded loader is visible for at least 1.4s so user clearly sees logo and progress
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 500);
    const t2 = setTimeout(() => setStage(2), 1000);
    const minTimer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 1400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(minTimer);
    };
  }, []);

  // Dismiss only when minimum time has passed AND loading is complete
  const isVisible = !(minTimeElapsed && !isLoading);

  // Gracefully unmount after fade-out transition finishes
  useEffect(() => {
    if (!isVisible) {
      const timer = setTimeout(() => setShouldRender(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  const messages = [
    "Loading 3D Skyscraper...",
    "Connecting Live Attention Market...",
    "Ready...",
  ];

  return (
    <div
      className={`building-loader-overlay ${!isVisible ? "fade-out" : ""}`}
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
