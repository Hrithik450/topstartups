"use client";

import { useEffect, useState } from "react";

export default function BuildingLoader({ isLoading }: { isLoading: boolean }) {
  const [stage, setStage] = useState(0);
  const [shouldRender, setShouldRender] = useState(true);

  // Cycle loading status text
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 600);
    const t2 = setTimeout(() => setStage(2), 1400);
    const t3 = setTimeout(() => setStage(3), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Graceful unmount after fade-out transition
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setShouldRender(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!shouldRender) return null;

  const messages = [
    "Assembling Virtual Skyscraper...",
    "Constructing 50 3D Floors...",
    "Connecting Live Attention Market...",
    "Finalizing Digital Skyline...",
  ];

  return (
    <div
      className={`building-loader-overlay ${!isLoading ? "fade-out" : ""}`}
      aria-label="Loading GeTopFloor 3D Skyscraper"
      role="status"
    >
      <div className="building-loader-card">
        {/* Brand Logo */}
        <div className="building-loader-logo-wrap">
          <img
            src="/logo.png"
            alt="GeTopFloor Logo"
            className="building-loader-logo"
            width={76}
            height={76}
          />
        </div>

        {/* Animated Skyscraper Graphic */}
        <div className="skyscraper-anim">
          {/* Spire & Beacon */}
          <div className="skyscraper-spire">
            <div className="skyscraper-beacon" />
          </div>

          {/* Penthouse Top Floor */}
          <div className="skyscraper-floor penthouse">
            <span className="floor-gold-badge">#1</span>
          </div>

          {/* Stacking Middle Floors */}
          <div className="skyscraper-floor floor-4" />
          <div className="skyscraper-floor floor-3" />
          <div className="skyscraper-floor floor-2" />
          <div className="skyscraper-floor floor-base" />
        </div>

        {/* Loading Information */}
        <div className="building-loader-info">
          <div className="building-loader-title">GeTopFloor</div>
          <p className="building-loader-message">{messages[stage]}</p>
        </div>

        {/* Progress Bar */}
        <div className="building-loader-bar-track">
          <div className="building-loader-bar-fill" />
        </div>
      </div>
    </div>
  );
}
