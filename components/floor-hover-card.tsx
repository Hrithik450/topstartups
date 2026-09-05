"use client";

import React from "react";
import type { Floor } from "@/lib/db/config/schema";
import { Close } from "./icons";

function getTimeAgo(dateInput?: string | Date | null) {
  if (!dateInput) return "3d ago";
  const diffMs = Date.now() - new Date(dateInput).getTime();
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
  listing: Floor;
  rank: number;
  pinned?: boolean;
}

function ExternalLink() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

export function FloorHoverCard({
  data,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: {
  data: HoverData | null;
  onClose?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  if (!data) return null;
  const { listing, rank } = data;
  const rawUrl = listing?.companyUrl || "";
  const rawName = listing?.companyName || "";

  const cleanDomain = rawUrl
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .replace(/^www\./, "")
    .toLowerCase();
  const displayName = (rawName || cleanDomain || "startup").toLowerCase();
  const targetUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  const customLogoUrl = listing?.logoUrl;
  const flag = "🇮🇳";
  const timeAgo = getTimeAgo(listing?.claimedAt || listing?.updatedAt);

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
          <div className="floor-hover-card-body">
            <div className="floor-hover-card-top-row">
              <div className="floor-hover-card-logo">
                {customLogoUrl ? (
                  <img
                    src={customLogoUrl}
                    alt={displayName}
                    className="floor-hover-card-img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        `https://www.google.com/s2/favicons?domain=${cleanDomain || "getopfloor.com"}&sz=128`;
                    }}
                  />
                ) : cleanDomain ? (
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`}
                    alt={displayName}
                    className="floor-hover-card-img"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    className="floor-hover-card-avatar"
                    style={{
                      backgroundColor: stringToColor(displayName || "?"),
                    }}
                  >
                    {(displayName || "?").trim().charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="floor-hover-card-rank-badge">#{rank}</div>
            </div>

            <div className="floor-hover-card-main-info">
              <h3 className="floor-hover-card-title">{displayName}</h3>
              <div
                className="floor-hover-card-price"
                style={{
                  color: "#ff9f43",
                  fontWeight: 600,
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "3px",
                }}
              >
                ✨ Claimed Floor · ₹{listing?.pricePaid ?? 0}
              </div>
            </div>

            <div className="floor-hover-card-meta-list">
              <div className="floor-hover-card-meta-item">
                <span className="meta-icon">🏷️</span>
                <span className="meta-label">Category:</span>
                <span className="meta-value">{listing?.category || "Startup"}</span>
              </div>

              <div className="floor-hover-card-meta-item">
                <span className="meta-icon">📍</span>
                <span className="meta-label">Location:</span>
                <span className="meta-value">{flag} India</span>
              </div>

              <div className="floor-hover-card-meta-item">
                <span className="meta-icon">🗓️</span>
                <span className="meta-label">Listed:</span>
                <span className="meta-value">{timeAgo}</span>
              </div>

              <div className="floor-hover-card-meta-item meta-about">
                <span className="meta-icon">📄</span>
                <span className="meta-label">About:</span>
                <span className="meta-value">
                  {listing?.description ||
                    listing?.tagline ||
                    "Claimed floor on GeTopFloor skyscraper."}
                </span>
              </div>
            </div>

            {/* Action Button: Visit Website */}
            <div className="floor-hover-card-action">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
