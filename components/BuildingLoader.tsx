"use client";

import { useEffect, useState } from "react";

export default function BuildingLoader({ isLoading }: { isLoading: boolean }) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  // Guarantee branded loader is visible for a brief, smooth moment (900ms)
  useEffect(() => {
    const minTimer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 900);

    return () => {
      clearTimeout(minTimer);
    };
  }, []);

  // Dismiss when minimum time has passed AND loading is complete
  const isVisible = !(minTimeElapsed && !isLoading);

  // Gracefully unmount after fade-out transition
  useEffect(() => {
    if (!isVisible) {
      const timer = setTimeout(() => setShouldRender(false), 450);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <div
      className={`building-loader-overlay ${!isVisible ? "fade-out" : ""}`}
      aria-label="Loading GeTopFloor"
      role="status"
    >
      <div className="premium-loader-wrapper">
        <div className="premium-loader-ring" />
        <div className="premium-loader-logo-inner">
          <img
            src="/logo.png"
            alt="GeTopFloor"
            className="premium-loader-logo-img"
            width={72}
            height={72}
          />
        </div>
      </div>
    </div>
  );
}
