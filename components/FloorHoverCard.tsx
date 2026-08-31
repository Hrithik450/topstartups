"use client";

import React from "react";
import type { Listing } from "@/lib/three/listings";

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
}

export default function FloorHoverCard({ data }: { data: HoverData | null }) {
  if (!data) return null;
  const { listing, rank } = data;

  const cleanDomain = listing.url_or_handle.replace(/^https?:\/\//i, "").split("/")[0].replace(/^www\./, "");
  const hasLogo = AVAILABLE_LOGOS.has(cleanDomain);
  const flag = getFlagEmoji(listing.country_code);
  const timeAgo = getTimeAgo(listing.created_at);

  return (
    <div className="floor-hover-card-wrapper animate-card-fade">
      <a
        href={listing.url_or_handle}
        target="_blank"
        rel="noopener noreferrer"
        className="floor-hover-card"
      >
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

            <div className="floor-hover-card-rank-badge">
              #{rank}
            </div>
          </div>

          <div className="floor-hover-card-main-info">
            <h3 className="floor-hover-card-title">{listing.title}</h3>
            <div className="floor-hover-card-price">
              Claimed floor at ₹{listing.total_paid}
            </div>
          </div>

          <div className="floor-hover-card-meta-list">
            <div className="floor-hover-card-meta-item">
              <span className="meta-icon">🏷️</span>
              <span className="meta-label">Category:</span>
              <span className="meta-value">{listing.category || "AI Agents & Infrastructure"}</span>
            </div>

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

            {listing.description && (
              <div className="floor-hover-card-meta-item meta-about">
                <span className="meta-icon">📄</span>
                <span className="meta-label">About:</span>
                <span className="meta-value">{listing.description}</span>
              </div>
            )}
          </div>
        </div>
      </a>
    </div>
  );
}
