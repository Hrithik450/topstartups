"use client";

import { useEffect, useRef } from "react";
import { useStatsStore } from "@/store/stats-store";
import { getClientCountryGuess } from "@/lib/stats";

export function StatsSync() {
  const { pingAndSync } = useStatsStore();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

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

    // 1. Initial heartbeat ping (runs once per session on mount)
    pingAndSync({
      sessionId,
      countryCode: countryGuess?.code,
      countryName: countryGuess?.name,
      isNewSession,
    });

    // 2. Regular heartbeat every 35 seconds to maintain active presence (< 120s server cutoff)
    const interval = setInterval(() => {
      pingAndSync({
        sessionId,
        countryCode: countryGuess?.code,
        countryName: countryGuess?.name,
        isNewSession: false,
      });
    }, 35000);

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

    // 5. Debounced refresh when a floor is successfully claimed
    let claimTimer: NodeJS.Timeout | null = null;
    const handleFloorClaimed = () => {
      if (claimTimer) clearTimeout(claimTimer);
      claimTimer = setTimeout(() => {
        pingAndSync({
          sessionId,
          countryCode: countryGuess?.code,
          countryName: countryGuess?.name,
          isNewSession: false,
          force: true,
        });
      }, 800);
    };
    window.addEventListener("floor-claimed-success", handleFloorClaimed);

    return () => {
      clearInterval(interval);
      if (claimTimer) clearTimeout(claimTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handleLeave);
      window.removeEventListener("floor-claimed-success", handleFloorClaimed);
    };
  }, [pingAndSync]);

  return null;
}
