import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { LiveStatsData } from "@/lib/stats";
import { calculateTowerHeightFt } from "@/lib/stats";

export type { LiveStatsData };

export interface StatsStore {
  stats: LiveStatsData;
  isStatsReady: boolean;

  setStats: (newStats: Partial<LiveStatsData> | null) => void;
  pingAndSync: (input: {
    sessionId: string;
    countryCode?: string;
    countryName?: string;
    isNewSession?: boolean;
  }) => Promise<void>;
}

export const DEFAULT_STATS: LiveStatsData = {
  online: 1,
  heightFt: calculateTowerHeightFt(0),
  claimedFloors: 0,
  totalFloors: 0,
  totalViews: 0,
  countriesCount: 1,
};

export const useStatsStore = create<StatsStore>()(
  devtools((set, get) => ({
    stats: DEFAULT_STATS,
    isStatsReady: false,

    setStats: (newStats) => {
      if (!newStats) return;
      set((state) => {
        const merged = { ...state.stats, ...newStats };
        const floorCount = merged.claimedFloors || merged.totalFloors || 0;
        if (newStats.heightFt !== undefined) {
          merged.heightFt = newStats.heightFt;
        } else {
          merged.heightFt = calculateTowerHeightFt(floorCount);
        }
        return {
          stats: merged,
          isStatsReady: true,
        };
      });
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
