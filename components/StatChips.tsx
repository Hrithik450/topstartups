"use client";

import { useEffect, useState } from "react";
import { RulerTall, Stack, Eye, Globe, Close, BarChart } from "./icons";

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
    totalViews: 1,
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
    const pingAndSyncStats = async () => {
      try {
        const res = await fetch("/api/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            countryCode: countryGuess?.code,
            countryName: countryGuess?.name,
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

    // Initial sync
    pingAndSyncStats();

    // Re-ping every 35 seconds to maintain real online presence
    const interval = setInterval(pingAndSyncStats, 35000);
    return () => clearInterval(interval);
  }, [initialHeightFt]);

  return stats;
}

import { useUserAuth } from "@/lib/auth/use-user-auth";

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
          <Eye /> <span className="num" suppressHydrationWarning>{stats.mounted ? stats.totalViews.toLocaleString() : "1"}</span> views
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
    ...(user
      ? [
          {
            key: "user-profile",
            className: "user-profile-chip",
            render: () => (
              <button
                type="button"
                onClick={onOpenManage}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: 0,
                  cursor: "pointer",
                  font: "inherit",
                }}
                title="Manage your claimed startup floors"
              >
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
                <span>{user.name?.split(" ")[0] || "My Profile"}</span>
                {ownedFloors.length > 0 && (
                  <span style={{ fontSize: "10.5px", opacity: 0.75 }}>
                    ({ownedFloors.length})
                  </span>
                )}
              </button>
            ),
          },
        ]
      : [
          {
            key: "login-chip",
            className: "login-chip-bounce",
            render: () => (
              <button
                type="button"
                onClick={() => login()}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: 0,
                  cursor: "pointer",
                  font: "inherit",
                  fontWeight: 600,
                }}
                title="Sign In with Google"
              >
                <svg width="12" height="12" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Login</span>
              </button>
            ),
          },
        ]),
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
      {chips.map((c, i) => (
        <span key={c.key} className={`chip ${c.className ?? ""}`} style={{ ["--i" as string]: i }}>
          {c.render()}
        </span>
      ))}
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
              <span className="stat-card-badge">ATTENTION</span>
            </div>
            <div className="stat-card-value" suppressHydrationWarning>
              {stats.mounted ? stats.totalViews.toLocaleString() : "1"}
            </div>
            <div className="stat-card-label">Verified page impressions across tower</div>
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
