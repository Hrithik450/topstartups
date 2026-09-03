"use client";

import React from "react";
import type { Listing } from "@/lib/three/listings";
import { Close } from "./icons";
import { useUserAuth } from "@/lib/auth/use-user-auth";

const AVAILABLE_LOGOS = new Set([
  "befailproof.ai",
  "japanpr.me",
  "slopfolio.com",
  "jointracks.ai",
  "partners.smashbyte.com",
  "ezugc.ai",
  "coachfit.health",
  "screensnap.pro",
  "x.com",
  "coreloop.team",
  "propgear.io",
  "tryrankwise.com",
  "ownpx.com",
  "itshemp.in",
  "smit.net",
  "outrank.world",
]);

function getFlagEmoji(countryCode?: string | null) {
  if (!countryCode || countryCode.length !== 2) return "🇮🇳";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function getTimeAgo(dateStr?: string | null) {
  if (!dateStr) return "3d ago";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "today";
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 52%)`;
}

export interface HoverData {
  listing: Listing;
  rank: number;
  pinned?: boolean;
}

export const ExternalLink = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
);

export default function FloorHoverCard({
  data,
  onClose,
  onManage,
  onMouseEnter,
  onMouseLeave,
}: {
  data: HoverData | null;
  onClose?: () => void;
  onManage?: (listing: Listing) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  if (!data) return null;
  const { listing, rank } = data;
  const { user, isOwnerOfFloor } = useUserAuth();
  const isOwner = isOwnerOfFloor(rank) || Boolean(user?.email && listing.owner_email && listing.owner_email === user.email);

  const cleanDomain = listing.url_or_handle.replace(/^https?:\/\//i, "").split("/")[0].replace(/^www\./, "");
  const targetUrl = listing.url_or_handle.startsWith("http") ? listing.url_or_handle : `https://${listing.url_or_handle}`;
  const hasLogo = AVAILABLE_LOGOS.has(cleanDomain);
  const flag = getFlagEmoji(listing.country_code);
  const timeAgo = getTimeAgo(listing.created_at);

  return (
    <div
      className="floor-hover-card-wrapper animate-card-fade"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="floor-hover-card-container">
        {onClose && (
          <button
            type="button"
            className="floor-hover-card-close"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close overview card"
            title="Close"
          >
            <Close />
          </button>
        )}

        <div className="floor-hover-card">
          {listing.hiring && (
            <div className="floor-hover-card-header">
              HIRING ACTIVELY
            </div>
          )}

          <div className="floor-hover-card-body">
            <div className="floor-hover-card-top-row">
              <div className="floor-hover-card-logo">
                {hasLogo ? (
                  <img
                    src={`/company-logos/${cleanDomain}.jpg`}
                    alt={listing.title}
                    className="floor-hover-card-img"
                  />
                ) : (
                  <div
                    className="floor-hover-card-avatar"
                    style={{ backgroundColor: stringToColor(listing.title || cleanDomain) }}
                  >
                    {(listing.title.trim().charAt(0) || "?").toUpperCase()}
                  </div>
                )}
              </div>

              <div className={`floor-hover-card-rank-badge ${listing.is_locked ? "locked" : ""}`}>
                #{rank} {listing.is_locked ? "🔒" : ""}
              </div>
            </div>

            <div className="floor-hover-card-main-info">
              <h3 className="floor-hover-card-title">
                {listing.is_claimed ? listing.title : `Floor #${rank} — Available`}
              </h3>
              <div
                className="floor-hover-card-price"
                style={{
                  color: listing.is_locked ? "#fbbf24" : listing.is_claimed ? "#ff9f43" : "#22c55e",
                  fontWeight: 600,
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "3px",
                }}
              >
                {listing.is_locked ? (
                  <>
                    <span className="locked-pulse-dot" style={{ width: 6, height: 6 }} />
                    Claim in progress...
                  </>
                ) : listing.is_claimed ? (
                  <>✨ Claimed Floor · ₹{listing.total_paid}</>
                ) : (
                  <>🟢 Open Floor · ₹50 to Claim</>
                )}
              </div>
            </div>

            <div className="floor-hover-card-meta-list">
              <div className="floor-hover-card-meta-item">
                <span className="meta-icon">🏷️</span>
                <span className="meta-label">Status:</span>
                <span className="meta-value" style={listing.is_locked ? { color: "#fbbf24", fontWeight: 600 } : undefined}>
                  {listing.is_locked
                    ? "🔒 Claim in Progress"
                    : listing.is_claimed
                    ? (listing.category || "Startup")
                    : "Available for Claim"}
                </span>
              </div>

              {listing.is_claimed && (
                <>
                  <div className="floor-hover-card-meta-item">
                    <span className="meta-icon">📍</span>
                    <span className="meta-label">Location:</span>
                    <span className="meta-value">{flag} {listing.country_name || "India"}</span>
                  </div>

                  <div className="floor-hover-card-meta-item">
                    <span className="meta-icon">🗓️</span>
                    <span className="meta-label">Listed:</span>
                    <span className="meta-value">{timeAgo}</span>
                  </div>
                </>
              )}

              <div className="floor-hover-card-meta-item meta-about">
                <span className="meta-icon">📄</span>
                <span className="meta-label">About:</span>
                <span className="meta-value" style={listing.is_locked ? { color: "#fbbf24", fontWeight: 500 } : undefined}>
                  {listing.is_locked
                    ? "⚡ Someone is claiming this floor right now..."
                    : listing.is_claimed
                    ? (listing.description || "Claimed floor on GeTopFloor skyscraper.")
                    : "This floor is waiting for an ambitious startup. Claim top floor now to showcase your product to global founders and investors."}
                </span>
              </div>
            </div>

            {/* Action Buttons: Visit Website / Claim Floor / Edit Floor (Owner Only) */}
            <div className="floor-hover-card-action">
              {listing.is_locked ? (
                <button
                  type="button"
                  className="floor-hover-card-visit-btn"
                  disabled
                  style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    color: "#fbbf24",
                    fontWeight: 600,
                    cursor: "not-allowed",
                    width: "100%",
                  }}
                >
                  <span>🔒 Someone is claiming this floor...</span>
                </button>
              ) : listing.is_claimed ? (
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="floor-hover-card-visit-btn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>Visit Website</span>
                  <ExternalLink />
                </a>
              ) : (
                <button
                  type="button"
                  className="floor-hover-card-visit-btn claim-action-btn"
                  style={{
                    background: "linear-gradient(135deg,#ff9f43,#ee5253)",
                    color: "#fff",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    width: "100%",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const floorPrice = Number(listing.total_paid) || (50 + (50 - rank));
                    window.dispatchEvent(
                      new CustomEvent("select-floor-price", {
                        detail: { price: floorPrice, rank },
                      })
                    );
                    const inputEl = document.querySelector<HTMLInputElement>(".url-field input");
                    if (inputEl) {
                      inputEl.focus();
                      inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                  }}
                >
                  <span>🚀 Claim Floor #{rank} for ₹{Number(listing.total_paid) || (50 + (50 - rank))}</span>
                </button>
              )}

              {isOwner && onManage && (
                <button
                  type="button"
                  className="floor-hover-card-manage-btn"
                  style={{
                    background: "rgba(255, 159, 67, 0.18)",
                    border: "1px solid rgba(255, 159, 67, 0.4)",
                    color: "#ff9f43",
                    fontWeight: 600,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onManage(listing);
                  }}
                  title="Update your claimed floor details"
                >
                  Manage
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}