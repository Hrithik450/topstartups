"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { TowerHandle } from "@/lib/three/app";
import Hero from "./Hero";
import StatChips, { MobileStatsSheet, useLiveStats } from "./StatChips";
import Controls from "./Controls";
import FloorHoverCard, { type HoverData } from "./FloorHoverCard";
import ManageFloorModal from "./ManageFloorModal";
import { Moon, Sun, BarChart } from "./icons";
import type { Listing } from "@/lib/three/listings";

const TowerScene = dynamic(() => import("./TowerScene"), { ssr: false });

export default function Experience() {
  const handleRef = useRef<TowerHandle | null>(null);
  const [hoveredData, setHoveredData] = useState<HoverData | null>(null);
  const [theme, setTheme] = useState<"dark" | "sunset">("dark");
  const [isMobileStatsOpen, setIsMobileStatsOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [listings, setListings] = useState<Listing[] | undefined>(undefined);
  const stats = useLiveStats(731);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Load live floors from backend (auto-seeded with 50 premium placeholders)
  useEffect(() => {
    fetch("/api/floors")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.floors) && data.floors.length > 0) {
          const mapped: Listing[] = data.floors.map((f: any) => ({
            id: String(f.id),
            url_or_handle: f.url,
            title: f.companyName,
            description: f.description || f.tagline,
            category: f.category || "Available Floor",
            total_paid: f.pricePaid,
            created_at: f.createdAt || new Date().toISOString(),
            is_claimed: f.isClaimed,
            rank: f.rank,
            clicks: 0,
            views: 0,
          }));
          setListings(mapped);
        }
      })
      .catch((err) => {
        console.warn("Could not load backend floors, falling back to local placeholders:", err);
      });
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "sunset" : "dark";
    setTheme(nextTheme);
    handleRef.current?.setTheme(nextTheme);
  };

  return (
    <div className="stage" data-theme={theme}>
      <TowerScene handleRef={handleRef} onFloorHover={setHoveredData} theme={theme} listings={listings} />
      <div className="tower-top-fade" aria-hidden="true" />
      <div className="tower-cloud-fade" aria-hidden="true" />
      <div className="ui">
        {/* Desktop Brand */}
        <div className="brand desktop-brand">GeTopFloor</div>

        {/* Mobile Header Bar */}
        <header className="mobile-header">
          <div className="mobile-brand-title">GeTopFloor</div>
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
        <FloorHoverCard
          data={hoveredData}
          onClose={() => setHoveredData(null)}
          onManage={() => setIsManageModalOpen(true)}
        />
        <MobileStatsSheet open={isMobileStatsOpen} onClose={() => setIsMobileStatsOpen(false)} />
        <ManageFloorModal
          isOpen={isManageModalOpen}
          onClose={() => setIsManageModalOpen(false)}
        />
      </div>
    </div>
  );
}
