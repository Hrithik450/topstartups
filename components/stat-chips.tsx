"use client";

import { useEffect, useState } from "react";
import { RulerTall, Stack, Eye, Globe, Close, BarChart, Money } from "./icons";
import { useFloorsStore } from "@/store/floors-store";
import { useStatsStore } from "@/store/stats-store";
import { calculateTowerHeightFt, getClientCountryGuess } from "@/lib/stats";

export function useLiveStats(customHeightFt?: number | string) {
  const { stats, isStatsReady, pingAndSync } = useStatsStore();
  const { floors } = useFloorsStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    let sessionId = "";
    try {
      sessionId = sessionStorage.getItem("gtf_visitor_session") || "";
      if (!sessionId) {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
          sessionId = "sess_" + crypto.randomUUID().replace(/-/g, "");
        } else if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
          const bytes = new Uint8Array(16);
          crypto.getRandomValues(bytes);
          sessionId = "sess_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
        } else {
          sessionId = "sess_" + Date.now().toString(16);
        }
        sessionStorage.setItem("gtf_visitor_session", sessionId);
      }
    } catch {
      sessionId = "sess_fallback_" + Date.now().toString(16);
    }

    const countryGuess = getClientCountryGuess();

    // Record 1 visit per visitor session (prevents duplicate increments on reloads)
    let isNewSession = false;
    try {
      if (!sessionStorage.getItem("gtf_visit_recorded")) {
        isNewSession = true;
        sessionStorage.setItem("gtf_visit_recorded", "true");
      }
    } catch {
      isNewSession = true;
    }

    // 1. Initial heartbeat ping
    pingAndSync({
      sessionId,
      countryCode: countryGuess?.code,
      countryName: countryGuess?.name,
      isNewSession,
    });

    // 2. Re-ping every 25 seconds to maintain real online presence
    const interval = setInterval(() => {
      pingAndSync({
        sessionId,
        countryCode: countryGuess?.code,
        countryName: countryGuess?.name,
        isNewSession: false,
      });
    }, 25000);

    // 3. Immediately ping on tab refocus if window was inactive
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        pingAndSync({
          sessionId,
          countryCode: countryGuess?.code,
          countryName: countryGuess?.name,
          isNewSession: false,
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // 4. Send leave beacon when user closes tab or navigates away
    const handleLeave = () => {
      if (typeof navigator !== "undefined" && navigator.sendBeacon && sessionId) {
        const blob = new Blob([JSON.stringify({ sessionId, action: "leave" })], {
          type: "application/json",
        });
        navigator.sendBeacon("/api/stats", blob);
      }
    };
    window.addEventListener("pagehide", handleLeave);

    // 5. Instantly sync stats whenever a floor is claimed, outbid, or refreshed
    const handleFloorUpdate = () => {
      pingAndSync({
        sessionId,
        countryCode: countryGuess?.code,
        countryName: countryGuess?.name,
        isNewSession: false,
      });
    };

    window.addEventListener("floors-refresh", handleFloorUpdate);
    window.addEventListener("floor-claimed-success", handleFloorUpdate);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handleLeave);
      window.removeEventListener("floors-refresh", handleFloorUpdate);
      window.removeEventListener("floor-claimed-success", handleFloorUpdate);
    };
  }, [pingAndSync]);

  const activeFloorCount = floors.length > 0 ? floors.length : stats.claimedFloors;
  const dynamicHeight =
    typeof customHeightFt === "number"
      ? customHeightFt
      : activeFloorCount > 0
      ? calculateTowerHeightFt(activeFloorCount)
      : typeof stats.heightFt === "number"
      ? stats.heightFt
      : calculateTowerHeightFt(0);

  const dynamicSales =
    floors.length > 0
      ? floors.reduce((sum, f) => sum + Number(f.pricePaid || 0), 0)
      : Number(stats.totalSales || 0);

  return {
    ...stats,
    heightFt: dynamicHeight,
    totalSales: dynamicSales,
    mounted: mounted || isStatsReady,
  };
}

export function StatChips({
  heightFt,
}: {
  heightFt?: number | string;
} = {}) {
  const stats = useLiveStats(heightFt);

  const chips = [
    {
      key: "online",
      className: "online",
      render: () => (
        <>
          <span className="dot" /> <span className="num">{stats.mounted ? stats.online : 1}</span>{" "}
          online
        </>
      ),
    },
    {
      key: "tall",
      render: () => (
        <>
          <RulerTall /> <span className="num">{stats.heightFt.toLocaleString()}</span> ft tall
        </>
      ),
    },
    {
      key: "claimed",
      render: () => (
        <>
          <Stack /> <span className="num">{stats.mounted ? stats.claimedFloors : 0}</span> floors
          claimed
        </>
      ),
    },
    {
      key: "sales",
      render: () => (
        <>
          <Money />{" "}
          <span className="num" suppressHydrationWarning>
            ₹{(stats.mounted ? stats.totalSales : 0).toLocaleString("en-IN")}
          </span>{" "}
          sales made
        </>
      ),
    },
    {
      key: "viewed",
      render: () => (
        <>
          <Eye />{" "}
          <span className="num" suppressHydrationWarning>
            {(stats.mounted ? stats.totalViews : 0).toLocaleString()}
          </span>{" "}
          visitors since launch
        </>
      ),
    },
    {
      key: "countries",
      render: () => (
        <>
          <Globe /> <span className="num">{stats.mounted ? stats.countriesCount : 1}</span>{" "}
          {stats.countriesCount === 1 ? "country" : "countries"} visited from
        </>
      ),
    },
    {
      key: "backed",
      render: () => (
        <a
          href="https://bharathunt.org"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span
            className="avatar"
            style={{ background: "linear-gradient(135deg,#ffd27c,#ff9f43)" }}
          />{" "}
          Backed by BharatHunt
        </a>
      ),
    },
  ];

  return (
    <div className="stats desktop-stats">
      {chips.map((c, i) => (
        <span
          key={c.key}
          className={`chip ${c.className ?? ""}`}
          style={{ ["--i" as string]: i }}
        >
          {c.render()}
        </span>
      ))}
    </div>
  );
}

export function MobileStatsSheet({
  open,
  onClose,
  heightFt,
}: {
  open: boolean;
  onClose: () => void;
  heightFt?: number | string;
}) {
  const stats = useLiveStats(heightFt);

  if (!open) return null;

  return (
    <div className="mobile-sheet-overlay" onClick={onClose}>
      <div className="mobile-sheet-content" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-sheet-handle" />

        <div className="mobile-sheet-header">
          <div className="mobile-sheet-title-row">
            <div className="mobile-sheet-icon">
              <BarChart />
            </div>
            <div>
              <h3 className="mobile-sheet-title">GeTopFloor Live Metrics</h3>
              <p className="mobile-sheet-sub">Real-time skyscraper statistics</p>
            </div>
          </div>
          <button className="mobile-sheet-close" onClick={onClose} aria-label="Close stats">
            ✕
          </button>
        </div>

        <div className="mobile-stats-grid">
          <div className="mobile-stat-card highlight">
            <div className="stat-card-top">
              <span className="dot" />
              <span className="stat-card-badge">LIVE TRAFFIC</span>
            </div>
            <div className="stat-card-value">{stats.mounted ? stats.online : 1}</div>
            <div className="stat-card-label">Active founders &amp; users online now</div>
          </div>

          <div className="mobile-stat-card">
            <div className="stat-card-top">
              <Money />
              <span className="stat-card-badge">SALES MADE</span>
            </div>
            <div className="stat-card-value" suppressHydrationWarning>
              ₹{(stats.mounted ? stats.totalSales : 0).toLocaleString("en-IN")}
            </div>
            <div className="stat-card-label">Total platform sales made in INR</div>
          </div>

          <div className="mobile-stat-card">
            <div className="stat-card-top">
              <RulerTall />
              <span className="stat-card-badge">HEIGHT</span>
            </div>
            <div className="stat-card-value">{stats.heightFt.toLocaleString()} ft</div>
            <div className="stat-card-label">Current virtual skyscraper altitude</div>
          </div>

          <div className="mobile-stat-card">
            <div className="stat-card-top">
              <Stack />
              <span className="stat-card-badge">FLOORS</span>
            </div>
            <div className="stat-card-value">{stats.mounted ? stats.claimedFloors : 0}</div>
            <div className="stat-card-label">Real claimed skyscraper floors</div>
          </div>

          <div className="mobile-stat-card">
            <div className="stat-card-top">
              <Eye />
              <span className="stat-card-badge">VISITORS</span>
            </div>
            <div className="stat-card-value" suppressHydrationWarning>
              {(stats.mounted ? stats.totalViews : 0).toLocaleString()}
            </div>
            <div className="stat-card-label">Visitors since launch across tower</div>
          </div>

          <div className="mobile-stat-card">
            <div className="stat-card-top">
              <Globe />
              <span className="stat-card-badge">GLOBAL REACH</span>
            </div>
            <div className="stat-card-value">
              {stats.mounted ? stats.countriesCount : 1}{" "}
              {stats.countriesCount === 1 ? "Country" : "Countries"}
            </div>
            <div className="stat-card-label">
              Countries visited from to explore startups on GeTopFloor
            </div>
          </div>
        </div>

        <div className="mobile-sheet-footer">
          <a
            href="https://bharathunt.org"
            target="_blank"
            rel="noopener noreferrer"
            className="badge-pill"
            style={{
              textDecoration: "none",
              color: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              className="avatar"
              style={{ background: "linear-gradient(135deg,#ffd27c,#ff9f43)" }}
            />{" "}
            Backed by BharatHunt
          </a>
        </div>
      </div>
    </div>
  );
}
