"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useCallback } from "react";
import type { TowerHandle } from "@/lib/three/app";
import { Hero } from "@/components/hero";
import { StatChips, MobileStatsSheet } from "@/components/stat-chips";
import { Controls } from "@/components/controls";
import { FloorHoverCard, type HoverData } from "@/components/floor-hover-card";
import { BuildingLoader } from "@/components/building-loader";
import { ManageFloorModal } from "@/components/manage-floor-modal";
import { Moon, Sun, ManageIcon, SoundOn, SoundOff } from "@/components/icons";
import type { Floor } from "@/lib/db/config/schema";
import { useFloorsStore } from "@/store/floors-store";
import { useUserStore } from "@/store/user-store";

const TowerScene = dynamic(() => import("./tower-scene").then((m) => m.TowerScene), { ssr: false });

export function Main({ initialFloors = [] }: { initialFloors?: Floor[] }) {
  const initializedRef = useRef(false);

  const { user, login } = useUserStore();
  const { floors, isFloorsReady, setFloors, setIsFloorsReady } = useFloorsStore();

  const handleRef = useRef<TowerHandle | null>(null);
  const [hoveredData, setHoveredData] = useState<HoverData | null>(null);

  const [theme, setTheme] = useState<"dark" | "sunset">("sunset");

  const [isSoundOn, setIsSoundOn] = useState(false);
  const [isMobileStatsOpen, setIsMobileStatsOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  const [isSceneReady, setIsSceneReady] = useState(false);
  const isBuildingLoading = !(isSceneReady && isFloorsReady);

  // Initialize store with SSR initialFloors once on mount
  useEffect(() => {
    if (!initializedRef.current && initialFloors.length > 0) {
      initializedRef.current = true;
      setFloors(initialFloors);
    }
  }, [initialFloors, setFloors]);

  const toggleSound = useCallback(() => {
    const next = handleRef.current?.toggleSound?.() ?? false;
    setIsSoundOn(next);
    return next;
  }, []);

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

  // Safety fallback only in case WebGL context fails to initialize
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSceneReady(true);
      setIsFloorsReady(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, [setIsFloorsReady]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "sunset" : "dark";
    setTheme(nextTheme);
    handleRef.current?.setTheme(nextTheme);
  };

  const displayFloors = floors && floors.length > 0 ? floors : initialFloors;

  return (
    <div className="stage" data-theme={theme}>
      <BuildingLoader isLoading={isBuildingLoading} />

      <TowerScene
        handleRef={handleRef}
        onFloorHover={handleFloorHover}
        theme={theme}
        floors={displayFloors}
        onLoaded={() => setIsSceneReady(true)}
      />

      <div className="tower-top-fade" aria-hidden="true" />
      <div className="tower-cloud-fade" aria-hidden="true" />
      <div className="ui">
        {/* Desktop Brand */}
        <div className="brand desktop-brand">GeTopFloor</div>

        {/* Mobile Header Bar */}
        <header className="mobile-header" style={{ background: "transparent" }}>
          <div className="mobile-brand-title">GeTopFloor</div>
          <div className="mobile-header-actions">
            <button className="mobile-header-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <Moon /> : <Sun />}
            </button>
            <button
              className={`mobile-header-btn ${isSoundOn ? "highlight" : ""}`}
              onClick={toggleSound}
              aria-label="Toggle ambient sky and birds sound"
              title="Toggle Sky & Birds Ambient Sound"
            >
              {isSoundOn ? <SoundOn /> : <SoundOff />}
            </button>
            {user ? (
              <button
                className="mobile-header-btn"
                onClick={() => setIsManageModalOpen(true)}
                aria-label="Manage your claimed floors"
                title="Manage your claimed floors"
                style={{ padding: "4px" }}
              >
                {user.image || user.avatarUrl ? (
                  <img
                    src={user.image || user.avatarUrl || ""}
                    alt={user.name || user.email || "Founder"}
                    style={{ width: "22px", height: "22px", borderRadius: "50%", objectFit: "cover" }}
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

        <Hero onOpenManage={() => setIsManageModalOpen(true)} initialFloors={initialFloors} />
        <StatChips onOpenManage={() => setIsManageModalOpen(true)} />
        <Controls
          handleRef={handleRef}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenStats={() => setIsMobileStatsOpen(true)}
          isSoundOn={isSoundOn}
          onToggleSound={toggleSound}
        />
        <FloorHoverCard
          data={hoveredData}
          onClose={handleCloseCard}
          onManage={() => setIsManageModalOpen(true)}
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
        />
        <MobileStatsSheet open={isMobileStatsOpen} onClose={() => setIsMobileStatsOpen(false)} />
        <ManageFloorModal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} />

        {/* Semantic SEO Directory for Search Engine Crawlers & Screen Readers */}
        <section
          className="sr-only"
          aria-label="GeTopFloor Skyscraper Directory & Company Listings"
        >
          <h2>GeTopFloor — Internet&apos;s Tallest 3D Startup Skyscraper</h2>
          <p>
            A real-time attention market and virtual skyscraper where startups and founders claim
            floors to outbid competitors, showcase their products, and reach thousands of global
            investors.
          </p>
          <ol>
            {(floors || []).map((floor, idx) => (
              <li key={floor.id || idx}>
                <h3>
                  Floor #{floor.rank || idx + 1}: {floor.companyName || floor.companyUrl}
                </h3>
                <p>Category: {floor.category}</p>
                <p>{floor.description}</p>
                <a href={floor.companyUrl} rel="noopener noreferrer">
                  Visit {floor.companyName || floor.companyUrl}
                </a>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
