"use client";

import { useEffect, useState } from "react";

export default function BuildingLoader({ isLoading }: { isLoading: boolean }) {
  const [shouldRender, setShouldRender] = useState(true);

  // When 3D assets & building finish loading, immediately fade out and unmount
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!shouldRender) return null;

  return (
    <div
      className={`building-loader-overlay ${!isLoading ? "fade-out" : ""}`}
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
