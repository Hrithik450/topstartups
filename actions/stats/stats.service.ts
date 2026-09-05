import { z } from "zod";
import { StatsModel } from "./stats.model";
import type { LiveStatsData } from "@/lib/stats";

export interface StatsResponse {
  success: boolean;
  data?: LiveStatsData;
  error?: string;
}

const recordPingSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  countryCode: z.string().optional(),
  countryName: z.string().optional(),
  isNewSession: z.boolean().optional(),
});

type TRecordPingSchema = z.input<typeof recordPingSchema>;

export class StatsService {
  /**
   * Fetch live skyscraper stats (online, views, countries, claimed floors).
   */
  static async getLiveStats(options?: { fresh?: boolean }): Promise<StatsResponse> {
    try {
      const stats = await StatsModel.getLiveStats(options);
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get live stats",
      };
    }
  }

  /**
   * Record visitor ping / heartbeat with normalization.
   */
  static async recordPing(input: TRecordPingSchema): Promise<{ success: boolean; error?: string }> {
    try {
      const validated = recordPingSchema.parse(input);
      const cleanSessionId = validated.sessionId?.trim();
      if (!cleanSessionId) {
        return { success: false, error: "Session ID is required" };
      }

      const cleanCountry = validated.countryCode?.toUpperCase().trim() || null;
      const cleanCountryName = validated.countryName?.trim() || null;

      await StatsModel.recordVisitAndPing({
        sessionId: cleanSessionId,
        countryCode: cleanCountry,
        countryName: cleanCountryName,
        isNewSession: Boolean(validated.isNewSession),
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to record ping",
      };
    }
  }

  /**
   * Remove active session immediately on visitor tab departure.
   */
  static async recordLeave(sessionId: string): Promise<void> {
    await StatsModel.recordLeave(sessionId);
  }
}
