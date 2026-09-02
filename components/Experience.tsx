"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { TowerHandle } from "@/lib/three/app";
import Hero from "./Hero";
import StatChips, { MobileStatsSheet, useLiveStats } from "./StatChips";
import Controls from "./Controls";
import FloorHoverCard, { type HoverData } from "./FloorHoverCard";
import ManageFloorModal from "./ManageFloorModal";
import BuildingLoader from "./BuildingLoader";
import { Moon, Sun, BarChart, ManageIcon } from "./icons";
import type { Listing } from "@/lib/three/listings";
import { useUserAuth } from "@/lib/auth/use-user-auth";

const TowerScene = dynamic(() => import("./TowerScene"), { ssr: false });

export default function Experience() {
  const handleRef = useRef<TowerHandle | null>(null);
  const [hoveredData, setHoveredData] = useState<HoverData | null>(null);
  const [theme, setTheme] = useState<"dark" | "sunset">("dark");
  const [isMobileStatsOpen, setIsMobileStatsOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isBuildingLoading, setIsBuildingLoading] = useState(true);
  const [listings, setListings] = useState<Listing[] | undefined>(undefined);
  const { user, login } = useUserAuth();

  const isCardHoveredRef = useRef(false);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPinnedRef = useRef(false);

  const handleFloorHover = useCallback((data: HoverData | null) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (data) {
      if (data.pinned) {
        isPinnedRef.current = true;
      }
      setHoveredData(data);
    } else {
      // If pinned open via tap/click, keep open until explicit close
      if (isPinnedRef.current) return;

      // 600ms grace period so mouse can easily travel into the card
      closeTimerRef.current = setTimeout(() => {
        if (!isCardHoveredRef.current && !isPinnedRef.current) {
          setHoveredData(null);
        }
      }, 600);
    }
  }, []);

  const handleCardMouseEnter = useCallback(() => {
    isCardHoveredRef.current = true;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const handleCardMouseLeave = useCallback(() => {
    isCardHoveredRef.current = false;
    if (isPinnedRef.current) return;
    closeTimerRef.current = setTimeout(() => {
      if (!isCardHoveredRef.current && !isPinnedRef.current) {
        setHoveredData(null);
      }
    }, 450);
  }, []);

  const handleCloseCard = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    isPinnedRef.current = false;
    isCardHoveredRef.current = false;
    setHoveredData(null);
  }, []);

  // Safety fallback so loading screen is snappy and never hangs
  useEffect(() => {
    const timer = setTimeout(() => setIsBuildingLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Load live floors from backend (auto-seeded with 50 premium placeholders)
  const refreshFloors = useCallback(() => {
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

  useEffect(() => {
    refreshFloors();
    window.addEventListener("floors-refresh", refreshFloors);
    return () => {
      window.removeEventListener("floors-refresh", refreshFloors);
    };
  }, [refreshFloors]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "sunset" : "dark";
    setTheme(nextTheme);
    handleRef.current?.setTheme(nextTheme);
  };

  return (
    <div className="stage" data-theme={theme}>
      <BuildingLoader isLoading={isBuildingLoading} />
      <TowerScene
        handleRef={handleRef}
        onFloorHover={handleFloorHover}
        theme={theme}
        listings={listings}
        onLoaded={() => setIsBuildingLoading(false)}
      />
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
              className="mobile-header-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Moon /> : <Sun />}
            </button>
            {user ? (
              <button
                className="mobile-header-btn"
                onClick={() => setIsManageModalOpen(true)}
                aria-label="Manage your claimed floors"
                title="Manage your claimed floors"
                style={{ padding: "4px" }}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || "Founder"}
                    style={{ width: "22px", height: "22px", borderRadius: "50%" }}
                  />
                ) : (
                  <span
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      background: "#ff9f43",
                      color: "#000",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      fontWeight: "bold",
                    }}
                  >
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
            ) : (
              <button
                className="mobile-header-btn highlight mobile-login-bounce"
                onClick={() => login()}
                aria-label="Manage Floors"
                title="Manage Floors"
              >
                <ManageIcon />
              </button>
            )}
          </div>
        </header>

        <Hero />
        <StatChips onOpenManage={() => setIsManageModalOpen(true)} />
        <Controls
          handleRef={handleRef}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenStats={() => setIsMobileStatsOpen(true)}
        />
        <FloorHoverCard
          data={hoveredData}
          onClose={handleCloseCard}
          onManage={() => setIsManageModalOpen(true)}
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
        />
        <MobileStatsSheet open={isMobileStatsOpen} onClose={() => setIsMobileStatsOpen(false)} />
        <ManageFloorModal
          isOpen={isManageModalOpen}
          onClose={() => setIsManageModalOpen(false)}
        />

        {/* Semantic SEO Directory for Search Engine Crawlers & Screen Readers */}
        <section className="sr-only" aria-label="GeTopFloor Skyscraper Directory & Company Listings">
          <h2>GeTopFloor — Internet&apos;s Tallest 3D Startup Skyscraper</h2>
          <p>
            A real-time attention market and virtual skyscraper where startups and founders claim floors to outbid competitors, showcase their products, and reach thousands of global investors.
          </p>
          <ol>
            {(listings || []).map((floor, idx) => (
              <li key={floor.id || idx}>
                <h3>
                  Floor #{floor.rank || idx + 1}: {floor.title}
                </h3>
                <p>Category: {floor.category}</p>
                <p>{floor.description}</p>
                <a href={floor.url_or_handle} rel="noopener noreferrer">
                  Visit {floor.title}
                </a>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
