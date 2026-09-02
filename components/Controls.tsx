"use client";

import { useState } from "react";
import type { TowerHandle } from "@/lib/three/app";
import {
  Reset,
  Plus,
  Minus,
  Ruler,
  Moon,
  Sun,
  ChevLeft,
  ChevRight,
  ArrowUp,
  ArrowDown,
  Rocket,
  Building,
  BarChart,
  Compass,
} from "./icons";

export default function Controls({
  handleRef,
  theme = "dark",
  onToggleTheme,
  onOpenStats,
}: {
  handleRef: React.MutableRefObject<TowerHandle | null>;
  theme?: "dark" | "sunset";
  onToggleTheme?: () => void;
  onOpenStats?: () => void;
}) {
  const [ruler, setRuler] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const h = () => handleRef.current;

  const handleThemeClick = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      h()?.toggleTheme();
    }
  };

  const showTooltip = (text: string) => {
    setActiveTooltip(text);
    setTimeout(() => {
      setActiveTooltip((curr) => (curr === text ? null : curr));
    }, 1600);
  };

  return (
    <>
      {/* Desktop Vertical Controls Sidebar */}
      <div className="controls desktop-controls">
        <button className="ctrl" onClick={() => h()?.reset()}>
          <Reset />
          <span>Reset</span>
        </button>

        <button className="ctrl" onClick={() => h()?.zoom(1)}>
          <Plus />
          <span>Zoom in</span>
        </button>
        <button className="ctrl" onClick={() => h()?.zoom(-1)}>
          <Minus />
          <span>Zoom out</span>
        </button>

        <button className={`ctrl ${theme === "dark" ? "active" : ""}`} onClick={handleThemeClick} title="Toggle Night / Evening Mode">
          {theme === "dark" ? <Moon /> : <Sun />}
          <span>{theme === "dark" ? "Night" : "Evening"}</span>
        </button>

        <button className={`ctrl ${ruler ? "active" : ""}`} onClick={() => setRuler(h()?.toggleRuler() ?? false)}>
          <Ruler />
          <span>Ruler {ruler ? "off" : "on"}</span>
        </button>

        <div className="ctrl group">
          <button className="mini" onClick={() => h()?.nudgeRotate(-1)} aria-label="Rotate left">
            <ChevLeft />
          </button>
          <button className="mini" onClick={() => h()?.nudgeRotate(1)} aria-label="Rotate right">
            <ChevRight />
          </button>
          <span>Rotate</span>
        </div>

        <div className="ctrl group">
          <button className="mini" onClick={() => h()?.moveFloors(1)} aria-label="Move up">
            <ArrowUp />
          </button>
          <button className="mini" onClick={() => h()?.moveFloors(-1)} aria-label="Move down">
            <ArrowDown />
          </button>
          <span>Move floors</span>
        </div>
      </div>

      {/* Mobile Floating Action Navigation Dock */}
      <nav className="mobile-nav-dock" aria-label="Skyscraper navigation dock">
        {activeTooltip && (
          <div className="mobile-dock-tooltip" role="status">
            {activeTooltip}
          </div>
        )}

        <button
          className="dock-btn"
          onClick={() => {
            h()?.jumpToTop();
            showTooltip("🚀 Top Penthouse");
          }}
          aria-label="Jump to top floor"
          title="Jump to Top Floor"
        >
          <Rocket />
          <span className="dock-label">Top</span>
        </button>

        <button
          className="dock-btn"
          onClick={() => {
            h()?.jumpToBase();
            showTooltip("🏢 Ground Plaza");
          }}
          aria-label="Jump to ground floor"
          title="Jump to Ground Plaza"
        >
          <Building />
          <span className="dock-label">Base</span>
        </button>

        <button
          className="dock-btn"
          onClick={() => {
            h()?.nudgeRotate(1);
            showTooltip("🔄 Orbit 45°");
          }}
          aria-label="Rotate tower"
          title="Rotate Tower"
        >
          <Compass />
          <span className="dock-label">Rotate</span>
        </button>

        <div className="dock-divider" />

        <button
          className="dock-btn"
          onClick={() => {
            h()?.moveFloors(1);
            showTooltip("🔼 Floor Up");
          }}
          aria-label="Move up one floor"
        >
          <ArrowUp />
          <span className="dock-label">Up</span>
        </button>

        <button
          className="dock-btn"
          onClick={() => {
            h()?.moveFloors(-1);
            showTooltip("🔽 Floor Down");
          }}
          aria-label="Move down one floor"
        >
          <ArrowDown />
          <span className="dock-label">Down</span>
        </button>

        <div className="dock-divider" />

        <button
          className={`dock-btn ${ruler ? "active" : ""}`}
          onClick={() => {
            const nextRuler = h()?.toggleRuler() ?? false;
            setRuler(nextRuler);
            showTooltip(nextRuler ? "📐 Ruler On" : "📐 Ruler Off");
          }}
          aria-label="Toggle height ruler"
        >
          <Ruler />
          <span className="dock-label">Ruler</span>
        </button>

        {onOpenStats && (
          <button
            className="dock-btn highlight"
            onClick={() => {
              onOpenStats();
              showTooltip("📊 Live Metrics");
            }}
            aria-label="Open live statistics"
            title="Open Live Statistics"
          >
            <BarChart />
            <span className="dock-label">Stats</span>
          </button>
        )}
      </nav>
    </>
  );
}
