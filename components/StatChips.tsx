"use client";

import { useEffect, useState } from "react";
import { RulerTall, Stack, Eye, Globe, Close, BarChart, ManageIcon } from "./icons";
import { useUserAuth } from "@/lib/auth/use-user-auth";

interface LiveStatsState {
  online: number;
  heightFt: number;
  claimedFloors: number;
  totalFloors: number;
  totalViews: number;
  countriesCount: number;
  mounted: boolean;
}

function getClientCountryGuess(): { code: string; name: string } | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.includes("Kolkata") || tz.includes("Calcutta") || tz.includes("India")) return { code: "IN", name: "India" };
    if (tz.includes("New_York") || tz.includes("Los_Angeles") || tz.includes("Chicago") || tz.includes("America")) return { code: "US", name: "United States" };
    if (tz.includes("London") || tz.includes("Europe/London")) return { code: "GB", name: "United Kingdom" };
    if (tz.includes("Berlin") || tz.includes("Europe/Berlin")) return { code: "DE", name: "Germany" };
    if (tz.includes("Paris") || tz.includes("Europe/Paris")) return { code: "FR", name: "France" };
    if (tz.includes("Tokyo") || tz.includes("Asia/Tokyo")) return { code: "JP", name: "Japan" };
    if (tz.includes("Singapore")) return { code: "SG", name: "Singapore" };
    if (tz.includes("Dubai")) return { code: "AE", name: "United Arab Emirates" };
    if (tz.includes("Sydney") || tz.includes("Melbourne")) return { code: "AU", name: "Australia" };
    if (tz.includes("Toronto") || tz.includes("Vancouver")) return { code: "CA", name: "Canada" };
    return null;
  } catch {
    return null;
  }
}

export function useLiveStats(initialHeightFt = 731) {
  const [stats, setStats] = useState<LiveStatsState>({
    online: 1,
    heightFt: initialHeightFt,
    claimedFloors: 0,
    totalFloors: 50,
    totalViews: 18028,
    countriesCount: 1,
    mounted: false,
  });

  useEffect(() => {
    // Generate or retrieve persistent session ID for active presence tracking
    let sessionId = "";
    try {
      sessionId = sessionStorage.getItem("gtf_visitor_session") || "";
      if (!sessionId) {
        sessionId = "sess_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessionStorage.setItem("gtf_visitor_session", sessionId);
      }
    } catch {
      sessionId = "sess_fallback_" + Date.now();
    }

    const countryGuess = getClientCountryGuess();

    // Ping server with visitor heartbeat and fetch real database stats
    const pingAndSyncStats = async (isNewSession: boolean = false) => {
      try {
        const res = await fetch("/api/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            countryCode: countryGuess?.code,
            countryName: countryGuess?.name,
            isNewSession,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.stats) {
            setStats({
              online: data.stats.online,
              heightFt: data.stats.heightFt || initialHeightFt,
              claimedFloors: data.stats.claimedFloors,
              totalFloors: data.stats.totalFloors || 50,
              totalViews: data.stats.totalViews,
              countriesCount: data.stats.countriesCount,
              mounted: true,
            });
          }
        }
      } catch (err) {
        console.warn("Could not sync live stats:", err);
      }
    };

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

    // 1. Initial page load: sync stats (and increment only if new session)
    pingAndSyncStats(isNewSession);

    // 2. Re-ping every 35 seconds to maintain real online presence (without incrementing view count)
    const interval = setInterval(() => pingAndSyncStats(false), 35000);
    return () => clearInterval(interval);
  }, [initialHeightFt]);

  return stats;
}

export default function StatChips({
  heightFt = 731,
  onOpenManage,
}: {
  heightFt?: number | string;
  onOpenManage?: () => void;
}) {
  const stats = useLiveStats(typeof heightFt === "number" ? heightFt : 731);
  const { user, ownedFloors, login } = useUserAuth();

  const chips = [
    ...(user
      ? [
          {
            key: "user-profile",
            className: "user-profile-chip",
            onClick: onOpenManage,
            title: "Manage your claimed startup floors",
            render: () => (
              <>
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || "Founder"}
                    style={{ width: "16px", height: "16px", borderRadius: "50%" }}
                  />
                ) : (
                  <span
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      background: "#ff9f43",
                      color: "#000",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "9px",
                      fontWeight: "bold",
                    }}
                  >
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </span>
                )}
                <span>Manage</span>
                {ownedFloors.length > 0 && (
                  <span style={{ fontSize: "10.5px", opacity: 0.85, background: "rgba(255,159,67,0.25)", padding: "1px 6px", borderRadius: "999px" }}>
                    {ownedFloors.length}
                  </span>
                )}
              </>
            ),
          },
        ]
      : [
          {
            key: "manage-chip",
            className: "login-chip-bounce",
            onClick: () => login(),
            title: "Manage your skyscraper startups",
            render: () => (
              <>
                <ManageIcon />
                <span>Manage</span>
              </>
            ),
          },
        ]),
    {
      key: "online",
      className: "online",
      render: () => (
        <>
          <span className="dot" /> <span className="num">{stats.mounted ? stats.online : 1}</span> online
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
          <Stack /> <span className="num">{stats.mounted ? stats.claimedFloors : 0}</span> floors claimed
        </>
      ),
    },
    {
      key: "viewed",
      render: () => (
        <>
          <Eye /> <span className="num" suppressHydrationWarning>{(stats.totalViews || 18028).toLocaleString()}</span> visitors since launch
        </>
      ),
    },
    {
      key: "countries",
      render: () => (
        <>
          <Globe /> <span className="num">{stats.mounted ? stats.countriesCount : 1}</span> {stats.countriesCount === 1 ? "country" : "countries"} visited from
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
          style={{ textDecoration: "none", color: "inherit", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <span className="avatar" style={{ background: "linear-gradient(135deg,#ffd27c,#ff9f43)" }} /> Backed by BharatHunt
        </a>
      ),
    },
  ];

  return (
    <div className="stats desktop-stats">
      {chips.map((c, i) => {
        if ("onClick" in c && c.onClick) {
          return (
            <button
              key={c.key}
              type="button"
              onClick={c.onClick}
              title={c.title}
              className={`chip ${c.className ?? ""}`}
              style={{ ["--i" as string]: i }}
            >
              {c.render()}
            </button>
          );
        }

        return (
          <span key={c.key} className={`chip ${c.className ?? ""}`} style={{ ["--i" as string]: i }}>
            {c.render()}
          </span>
        );
      })}
    </div>
  );
}

export function MobileStatsSheet({
  open,
  onClose,
  heightFt = 731,
}: {
  open: boolean;
  onClose: () => void;
  heightFt?: number | string;
}) {
  const stats = useLiveStats(typeof heightFt === "number" ? heightFt : 731);

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

        <div className="mobile-sheet-body">
          <div className="mobile-stat-card">
            <div className="stat-card-top">
              <span className="dot" />
              <span className="stat-card-badge">LIVE TRAFFIC</span>
            </div>
            <div className="stat-card-value">{stats.mounted ? stats.online : 1}</div>
            <div className="stat-card-label">Active founders &amp; users online now</div>
          </div>

          <div className="mobile-stat-card">
            <div className="stat-card-top">
              <RulerTall />
              <span className="stat-card-badge">HEIGHT</span>
            </div>
            <div className="stat-card-value">{heightFt} ft</div>
            <div className="stat-card-label">Current virtual skyscraper altitude</div>
          </div>

          <div className="mobile-stat-card">
            <div className="stat-card-top">
              <Stack />
              <span className="stat-card-badge">FLOORS</span>
            </div>
            <div className="stat-card-value">{stats.mounted ? stats.claimedFloors : 0} / 50</div>
            <div className="stat-card-label">Real claimed skyscraper floors</div>
          </div>

          <div className="mobile-stat-card">
            <div className="stat-card-top">
              <Eye />
              <span className="stat-card-badge">VISITORS</span>
            </div>
            <div className="stat-card-value" suppressHydrationWarning>
              {(stats.totalViews || 18028).toLocaleString()}
            </div>
            <div className="stat-card-label">Visitors since launch across tower</div>
          </div>

          <div className="mobile-stat-card full-span">
            <div className="stat-card-top">
              <Globe />
              <span className="stat-card-badge">GLOBAL REACH</span>
            </div>
            <div className="stat-card-value">
              {stats.mounted ? stats.countriesCount : 1} {stats.countriesCount === 1 ? "Country" : "Countries"}
            </div>
            <div className="stat-card-label">Countries visited from to explore startups on GeTopFloor</div>
          </div>
        </div>

        <div className="mobile-sheet-footer">
          <a
            href="https://bharathunt.org"
            target="_blank"
            rel="noopener noreferrer"
            className="badge-pill"
            style={{ textDecoration: "none", color: "inherit", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <span className="avatar" style={{ background: "linear-gradient(135deg,#ffd27c,#ff9f43)" }} /> Backed by BharatHunt
          </a>
        </div>
      </div>
    </div>
  );
}
