import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { LiveStatsData } from "@/actions/stats/stats.service";

export type { LiveStatsData };

export interface StatsStore {
  stats: LiveStatsData;
  isStatsReady: boolean;

  setStats: (newStats: Partial<LiveStatsData> | null) => void;
  fetchLiveStats: () => Promise<void>;
  pingAndSync: (input: {
    sessionId: string;
    countryCode?: string;
    countryName?: string;
    isNewSession?: boolean;
  }) => Promise<void>;
}

export const DEFAULT_STATS: LiveStatsData = {
  online: 1,
  heightFt: 731,
  claimedFloors: 0,
  totalFloors: 50,
  totalViews: 0,
  countriesCount: 1,
};

export const useStatsStore = create<StatsStore>()(
  devtools((set, get) => ({
    stats: DEFAULT_STATS,
    isStatsReady: false,

    setStats: (newStats) => {
      if (!newStats) return;
      set((state) => ({
        stats: { ...state.stats, ...newStats },
        isStatsReady: true,
      }));
    },

    fetchLiveStats: async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        const data = await res.json();
        if (data.success && data.stats) {
          get().setStats(data.stats);
        }
      } catch (err) {
        console.warn("Could not fetch live stats:", err);
      }
    },

    pingAndSync: async ({ sessionId, countryCode, countryName, isNewSession = false }) => {
      try {
        const res = await fetch("/api/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            countryCode,
            countryName,
            isNewSession,
          }),
        });

        const data = await res.json();
        if (data.success && data.stats) {
          get().setStats(data.stats);
        }
      } catch (err) {
        console.warn("Could not sync live stats heartbeat:", err);
      }
    },
  }))
);
