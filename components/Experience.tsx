"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { TowerHandle } from "@/lib/three/app";
import Hero from "./Hero";
import StatChips, { MobileStatsSheet } from "./StatChips";
import Controls from "./Controls";
import FloorHoverCard, { type HoverData } from "./FloorHoverCard";
import ManageFloorModal from "./ManageFloorModal";
import BuildingLoader from "./BuildingLoader";
import { Moon, Sun, ManageIcon, SoundOn, SoundOff } from "./icons";
import { INITIAL_LISTINGS, type Listing } from "@/lib/three/listings";
import { useUserAuth } from "@/lib/auth/use-user-auth";

const TowerScene = dynamic(() => import("./TowerScene"), { ssr: false });

export default function Experience() {
  const handleRef = useRef<TowerHandle | null>(null);
  const [hoveredData, setHoveredData] = useState<HoverData | null>(null);
  const [theme, setTheme] = useState<"dark" | "sunset">("sunset");
  const [isSoundOn, setIsSoundOn] = useState(false);
  const [isMobileStatsOpen, setIsMobileStatsOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isBuildingLoading, setIsBuildingLoading] = useState(true);
  const [listings, setListings] = useState<Listing[] | undefined>(INITIAL_LISTINGS);
  const { user, login } = useUserAuth();

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
    const timer = setTimeout(() => setIsBuildingLoading(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Load live claimed floors from backend
  const refreshFloors = useCallback(() => {
    fetch(`/api/floors?t=${Date.now()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.floors)) {
          const claimedMap = new Map<number, any>(data.floors.map((f: any) => [f.rank, f]));
          const full50: Listing[] = Array.from({ length: 50 }, (_, i) => {
            const rank = i + 1;
            const f = claimedMap.get(rank);
            if (f) {
              return {
                id: String(f.id),
                url_or_handle: f.url,
                title: f.companyName,
                description: f.description || f.tagline,
                category: f.category || "Startup",
                total_paid: f.pricePaid,
                created_at: f.createdAt || new Date().toISOString(),
                is_claimed: true,
                is_locked: Boolean(f.isLocked),
                lock_info: f.lockInfo,
                rank: f.rank,
                image_url: f.logoUrl,
                logoUrl: f.logoUrl,
                logo_url: f.logoUrl,
                owner_email: f.ownerEmail,
                clicks: 0,
                views: 0,
              };
            }
            return {
              id: `floor-slot-${rank}`,
              url_or_handle: "https://getopfloor.com",
              title: `Open Floor #${rank}`,
              description: "Spot reserved for your startup — Outbid & claim top floor",
              category: "Available Floor",
              total_paid: 0,
              created_at: new Date().toISOString(),
              is_claimed: false,
              is_locked: false,
              rank,
              country_code: "IN",
              country_name: "India",
              hiring: false,
              views: 0,
            };
          });
          setListings(full50);
        }
      })
      .catch((err) => {
        console.warn("Could not load backend floors:", err);
      });
  }, []);

  useEffect(() => {
    refreshFloors();
    window.addEventListener("floors-refresh", refreshFloors);
    return () => {
      window.removeEventListener("floors-refresh", refreshFloors);
    };
  }, [refreshFloors]);

  useEffect(() => {
    const handleClaimedSuccess = (e: any) => {
      const detail = e.detail || {};
      const targetRank = detail.rank || 1;

      // 1. Refresh floor data from server for everyone
      refreshFloors();

      // Only fly camera and pin overview card on the ACTUAL PURCHASER'S device
      if (!detail.isOwner) {
        return;
      }

      // 2. Smoothly fly elevator camera to the top penthouse floor for the owner
      setTimeout(() => {
        handleRef.current?.jumpToTop();
      }, 350);

      // 3. Immediately display the floor hover preview card for the owner
      setTimeout(() => {
        const topListing: Listing = {
          id: String(targetRank),
          url_or_handle: detail.url || "https://getopfloor.com",
          title: detail.companyName || "Top Startup",
          description: detail.description || detail.tagline || "Claimed Penthouse Floor #1",
          category: detail.category || "Startup",
          total_paid: detail.pricePaid || 50,
          created_at: new Date().toISOString(),
          is_claimed: true,
          rank: targetRank,
          clicks: 0,
          views: 0,
        };

        setHoveredData({
          listing: topListing,
          rank: targetRank,
          pinned: true,
        });
      }, 850);
    };

    window.addEventListener("floor-claimed-success", handleClaimedSuccess);
    return () => {
      window.removeEventListener("floor-claimed-success", handleClaimedSuccess);
    };
  }, [refreshFloors]);

  // Real-time multi-device SSE synchronization
  useEffect(() => {
    if (typeof window === "undefined") return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isMounted = true;

    const connectSSE = () => {
      if (!isMounted) return;
      try {
        eventSource = new EventSource("/api/events");

        // When another device claims a floor: silently sync 3D tower and floor list
        eventSource.addEventListener("floor-claimed", (e) => {
          try {
            refreshFloors();
            window.dispatchEvent(new CustomEvent("floors-refresh"));
          } catch {}
        });

        eventSource.addEventListener("lock-updated", (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.locks) {
              window.dispatchEvent(
                new CustomEvent("locks-updated", { detail: data.locks })
              );
            }
          } catch {}
          refreshFloors();
          window.dispatchEvent(new CustomEvent("floors-refresh"));
        });

        eventSource.onerror = () => {
          eventSource?.close();
          if (isMounted) {
            reconnectTimeout = setTimeout(connectSSE, 3500);
          }
        };
      } catch (err) {
        if (isMounted) {
          reconnectTimeout = setTimeout(connectSSE, 5000);
        }
      }
    };

    connectSSE();

    return () => {
      isMounted = false;
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
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
        <header className="mobile-header" style={{ background: "transparent" }}>
          <div className="mobile-brand-title">GeTopFloor</div>
          <div className="mobile-header-actions">
            <button
              className="mobile-header-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
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

        <Hero onOpenManage={() => setIsManageModalOpen(true)} />
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