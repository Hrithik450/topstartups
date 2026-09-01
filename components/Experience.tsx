"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { TowerHandle } from "@/lib/three/app";
import Hero from "./Hero";
import StatChips, { MobileStatsSheet, useLiveStats } from "./StatChips";
import Controls from "./Controls";
import FloorHoverCard, { type HoverData } from "./FloorHoverCard";
import { Moon, Sun, BarChart } from "./icons";

const TowerScene = dynamic(() => import("./TowerScene"), { ssr: false });

export default function Experience() {
  const handleRef = useRef<TowerHandle | null>(null);
  const [hoveredData, setHoveredData] = useState<HoverData | null>(null);
  const [theme, setTheme] = useState<"dark" | "sunset">("dark");
  const [isMobileStatsOpen, setIsMobileStatsOpen] = useState(false);
  const stats = useLiveStats(731);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "sunset" : "dark";
    setTheme(nextTheme);
    handleRef.current?.setTheme(nextTheme);
  };

  return (
    <div className="stage" data-theme={theme}>
      <TowerScene handleRef={handleRef} onFloorHover={setHoveredData} theme={theme} />
      <div className="tower-top-fade" aria-hidden="true" />
      <div className="tower-cloud-fade" aria-hidden="true" />
      <div className="ui">
        {/* Desktop Brand */}
        <div className="brand desktop-brand">BharatHunt</div>

        {/* Mobile Header Bar */}
        <header className="mobile-header">
          <div className="mobile-brand-title">BharatHunt</div>
          <div className="mobile-header-actions">
            <button
              className="mobile-header-chip"
              onClick={() => setIsMobileStatsOpen(true)}
              aria-label="Open live statistics"
            >
              <span className="dot" />
              <span className="num">{stats.online}</span> online
            </button>
            <button
              className="mobile-header-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Moon /> : <Sun />}
            </button>
            <button
              className="mobile-header-btn highlight"
              onClick={() => setIsMobileStatsOpen(true)}
              aria-label="Open statistics sheet"
            >
              <BarChart />
            </button>
          </div>
        </header>

        <Hero />
        <StatChips />
        <Controls
          handleRef={handleRef}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenStats={() => setIsMobileStatsOpen(true)}
        />
        <FloorHoverCard data={hoveredData} onClose={() => setHoveredData(null)} />
        <MobileStatsSheet open={isMobileStatsOpen} onClose={() => setIsMobileStatsOpen(false)} />
      </div>
    </div>
  );
}
