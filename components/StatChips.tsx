"use client";

import { useEffect, useState } from "react";
import { RulerTall, Stack, Eye, Globe, Close, BarChart } from "./icons";

export function useLiveStats(initialHeightFt = 731) {
  const [online, setOnline] = useState(52);
  const [viewed, setViewed] = useState(192775);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const a = setInterval(() => setOnline((n) => Math.max(20, n + (Math.random() < 0.5 ? -1 : 1))), 3200);
    const b = setInterval(() => setViewed((n) => n + Math.floor(Math.random() * 4) + 1), 2600);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, []);

  return { online: mounted ? online : 53, viewed, heightFt: initialHeightFt };
}

export default function StatChips({ heightFt = 731 }: { heightFt?: number | string }) {
  const stats = useLiveStats(typeof heightFt === "number" ? heightFt : 731);

  const chips = [
    {
      key: "online",
      className: "online",
      render: () => (
        <>
          <span className="dot" /> <span className="num">{stats.online}</span> online
        </>
      ),
    },
    { key: "tall", render: () => (<><RulerTall /> <span className="num">{stats.heightFt.toLocaleString()}</span> ft tall</>) },
    { key: "claimed", render: () => (<><Stack /> <span className="num">58</span> floors claimed</>) },
    { key: "viewed", render: () => (<><Eye /> <span className="num" suppressHydrationWarning>{stats.viewed.toLocaleString()}</span> views</>) },
    { key: "countries", render: () => (<><Globe /> <span className="num">127</span> countries visited from</>) },
    {
      key: "backed",
      render: () => (
        <>
          <span className="avatar" style={{ background: "linear-gradient(135deg,#ffd27c,#ff9f43)" }} /> Backed by GeTopFloor
        </>
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
            <div className="stat-card-value">{stats.online}</div>
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
            <div className="stat-card-value">50 / 50</div>
            <div className="stat-card-label">Floors claimed by companies</div>
          </div>

          <div className="mobile-stat-card">
            <div className="stat-card-top">
              <Eye />
              <span className="stat-card-badge">ATTENTION</span>
            </div>
            <div className="stat-card-value" suppressHydrationWarning>{stats.viewed.toLocaleString()}</div>
            <div className="stat-card-label">Unique impressions across floors</div>
          </div>

          <div className="mobile-stat-card full-span">
            <div className="stat-card-top">
              <Globe />
              <span className="stat-card-badge">GLOBAL REACH</span>
            </div>
            <div className="stat-card-value">127 Countries</div>
            <div className="stat-card-label">Global founders visiting and bidding on GeTopFloor</div>
          </div>
        </div>

        <div className="mobile-sheet-footer">
          <div className="badge-pill">
            <span className="avatar" style={{ background: "linear-gradient(135deg,#ffd27c,#ff9f43)" }} /> Backed by GeTopFloor
          </div>
        </div>
      </div>
    </div>
  );
}
