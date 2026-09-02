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
import { Moon, Sun, BarChart } from "./icons";
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
                aria-label="Sign In with Google"
                title="Sign In with Google"
              >
                <svg width="14" height="14" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
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
