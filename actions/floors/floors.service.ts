import { z } from "zod";
import {
  FloorsModel,
  type ClaimFloorPreparedInput,
  type ClaimResultModelResponse,
} from "@/actions/floors/floors.model";
import type { Floor, NewFloor } from "@/lib/db/config/schema";
import { validateWebsiteSyntax, extractRootHostname } from "@/lib/validation/domain";
import { scrapeWebsiteMetadata } from "@/lib/crawler/metadata";
import { persistImageToBlob } from "@/lib/storage/blob";
import { revalidateTag } from "next/cache";
import { UserService } from "@/actions/user/user.service";

export type { Floor, NewFloor, ClaimFloorPreparedInput, ClaimResultModelResponse };

export const updateFloorSchema = z.object({
  floorId: z.string().min(1, "Floor ID is required"),
  companyName: z.string().min(1, "Company name is required").optional(),
  companyUrl: z.string().min(3, "Valid website URL is required").optional(),
  category: z.string().min(1, "Category is required").optional(),
  tagline: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
});

export type TUpdateFloorSchema = z.input<typeof updateFloorSchema>;
export type UpdateFloorInput = z.infer<typeof updateFloorSchema>;

export const claimFloorSchema = z.object({
  checkoutSessionId: z.string().min(1, "Checkout Session ID is required"),
  paymentId: z.string().nullable().optional(),
  companyName: z.string().min(1, "Company name is required").optional(),
  companyUrl: z.string().min(3, "Company URL is required"),
  category: z.string().min(1, "Category is required").optional(),
  price: z.number().min(1, "Price must be at least ₹1"),
  tagline: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  customerEmail: z.string().email().or(z.literal("")).nullable().optional(),
  customerPhone: z.string().nullable().optional(),
});

export type TClaimFloorSchema = z.input<typeof claimFloorSchema>;
export type ClaimFloorInput = z.infer<typeof claimFloorSchema>;

export interface FloorResponse {
  success: boolean;
  data?: Floor | null;
  error?: string;
}

export interface FloorsResponse {
  success: boolean;
  data?: Floor[];
  totalCount?: number;
  error?: string;
}

export interface DeleteFloorResponse {
  success: boolean;
  message?: string;
  rank?: number;
  error?: string;
}

export interface ClaimResultResponse extends ClaimResultModelResponse {
  data?: Floor | null;
}

export class FloorsService {
  /**
   * Fetch all active floors on the skyscraper.
   */
  static async getFloors(): Promise<FloorsResponse> {
    try {
      const floors = await FloorsModel.getActiveFloors();
      return {
        success: true,
        data: floors || [],
        totalCount: floors?.length || 0,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        totalCount: 0,
        error: error instanceof Error ? error.message : "Failed to fetch floors",
      };
    }
  }

  /**
   * Get the current highest floor price and calculate required price for Top Floor (#1).
   */
  static async getTopFloorPrice() {
    return await FloorsModel.getTopFloorPrice();
  }

  /**
   * Calculate outbid requirements and top floor pricing for a candidate domain.
   */
  static async getOutbidPricing(
    cleanHost: string,
    userEmail?: string | null,
    userId?: string | null
  ): Promise<{
    topFloorPrice: number;
    maxPrice: number;
    existingFloor: Floor | null;
    minRequiredPrice: number;
  }> {
    const { maxPrice, topFloorPrice } = await FloorsModel.getTopFloorPrice();

    let existingFloor: Floor | null = null;

    if (userId) {
      const userRes = await UserService.getUserWithFloors(userId);
      existingFloor =
        userRes.data?.floors?.find((f) => extractRootHostname(f.companyUrl || "") === cleanHost) ||
        null;
    } else if (userEmail) {
      const userRes = await UserService.getUserWithFloorsByEmail(userEmail);
      existingFloor =
        userRes.data?.floors?.find((f) => extractRootHostname(f.companyUrl || "") === cleanHost) ||
        null;
    }

    if (!existingFloor) {
      existingFloor = await FloorsModel.findFloorByHost(cleanHost);
    }

    const minRequiredPrice = 50;

    return {
      topFloorPrice,
      maxPrice,
      existingFloor,
      minRequiredPrice,
    };
  }

  /**
   * Get claimed floors owned by a founder email.
   */
  static async getFloorsByEmail(email: string): Promise<FloorsResponse> {
    try {
      if (!email?.trim()) {
        return {
          success: true,
          data: [],
          totalCount: 0,
        };
      }

      const cleanEmail = email.toLowerCase().trim();
      const owned = await FloorsModel.getFloorsByEmail(cleanEmail);
      return {
        success: true,
        data: owned || [],
        totalCount: owned?.length || 0,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        totalCount: 0,
        error: error instanceof Error ? error.message : "Failed to fetch owned floors",
      };
    }
  }

  /**
   * Get a single floor by ID.
   */
  static async getFloorById(id: string): Promise<FloorResponse> {
    try {
      if (!id?.trim()) {
        return {
          success: false,
          data: null,
          error: "Floor ID is required",
        };
      }

      const cleanId = id.trim();
      const floor = await FloorsModel.getFloorById(cleanId);
      return {
        success: true,
        data: floor,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed to fetch floor",
      };
    }
  }

  /**
   * Get a single floor by rank.
   */
  static async getFloorByRank(rank: number): Promise<FloorResponse> {
    try {
      if (!rank || rank < 1 || rank > 50) {
        return {
          success: false,
          data: null,
          error: "Valid rank between 1 and 50 is required",
        };
      }

      const floor = await FloorsModel.getFloorByRank(rank);
      return {
        success: true,
        data: floor,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed to fetch floor by rank",
      };
    }
  }

  /**
   * Update floor details.
   */
  static async updateFloor(data: TUpdateFloorSchema, email: string): Promise<FloorResponse> {
    try {
      if (!email?.trim()) {
        return {
          success: false,
          data: null,
          error: "Unauthorized. Email is required to update your floor.",
        };
      }

      const validated = updateFloorSchema.parse(data);
      const cleanEmail = email.toLowerCase().trim();
      const setPayload: Partial<NewFloor> = {};

      if (validated.companyName?.trim()) {
        setPayload.companyName = validated.companyName.trim();
      }
      if (validated.companyUrl?.trim()) {
        let cleanUrl = validated.companyUrl.trim();
        if (!cleanUrl.startsWith("http")) cleanUrl = `https://${cleanUrl}`;
        setPayload.companyUrl = cleanUrl;
      }
      if (validated.category !== undefined) {
        setPayload.category = validated.category?.trim() || null;
      }
      if (validated.tagline !== undefined) {
        setPayload.tagline = validated.tagline?.trim() || null;
      }
      if (validated.description !== undefined) {
        setPayload.description = validated.description?.trim() || null;
      }
      if (validated.logoUrl !== undefined) {
        let logoToSet = validated.logoUrl?.trim() || null;
        if (logoToSet) {
          try {
            logoToSet = await persistImageToBlob(logoToSet, "logo");
          } catch {}
        }
        setPayload.logoUrl = logoToSet;
      }

      const updated = await FloorsModel.updateFloor(validated.floorId, cleanEmail, setPayload);

      if (!updated) {
        return {
          success: false,
          data: null,
          error: "Floor not found or you are not authorized to edit it.",
        };
      }

      try {
        revalidateTag("floors");
        revalidateTag(`floor-${validated.floorId}`);
        revalidateTag(`floors-owner-${cleanEmail}`);
      } catch {}

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed to update floor",
      };
    }
  }

  /**
   * Vacate a floor.
   */
  static async deleteFloor(floorId: string, email: string): Promise<DeleteFloorResponse> {
    try {
      if (!floorId?.trim()) {
        return {
          success: false,
          error: "Floor ID is required",
        };
      }

      if (!email?.trim()) {
        return {
          success: false,
          error: "Unauthorized. Email is required to vacate your floor.",
        };
      }

      const cleanFloorId = floorId.trim();
      const cleanEmail = email.toLowerCase().trim();
      const result = await FloorsModel.deleteFloor(cleanFloorId, cleanEmail);

      if (result.success) {
        try {
          revalidateTag("floors");
          revalidateTag(`floor-${cleanFloorId}`);
          revalidateTag(`floors-owner-${cleanEmail}`);
        } catch {}
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to vacate floor",
      };
    }
  }

  /**
   * Atomically claim top floor after payment verification.
   */
  static async claimTopFloor(data: TClaimFloorSchema): Promise<ClaimResultResponse> {
    try {
      const validated = claimFloorSchema.parse(data);

      const syntaxCheck = validateWebsiteSyntax(validated.companyUrl);
      if (!syntaxCheck.valid || !syntaxCheck.cleanUrl) {
        return {
          success: false,
          error: syntaxCheck.error || "Invalid website URL format.",
        };
      }
      const cleanUrl = syntaxCheck.cleanUrl;

      let finalCompanyName = validated.companyName?.trim();
      let finalTagline = validated.tagline?.trim();
      let finalDescription = validated.description?.trim();
      let finalLogoUrl = validated.logoUrl?.trim() || null;
      let finalCategory = validated.category?.trim() || "";

      if (
        !finalCompanyName ||
        !finalLogoUrl ||
        !finalDescription ||
        !finalTagline ||
        !finalCategory
      ) {
        try {
          const scraped = await scrapeWebsiteMetadata(cleanUrl);
          if (!finalCompanyName) finalCompanyName = scraped.companyName;
          if (!finalTagline) finalTagline = scraped.tagline;
          if (!finalDescription) finalDescription = scraped.description;
          if (!finalLogoUrl) finalLogoUrl = scraped.logoUrl;
          if (!finalCategory) finalCategory = scraped.category || "Startup";
        } catch (scrapeErr) {
          console.warn("Metadata auto-scrape error during transaction:", scrapeErr);
        }
      }

      if (!finalCompanyName) finalCompanyName = extractRootHostname(cleanUrl);
      finalCompanyName = finalCompanyName.toLowerCase();
      if (!finalCategory) finalCategory = "Startup";
      if (!finalTagline) finalTagline = `${finalCompanyName} — Official Skyscraper Floor`;
      if (!finalDescription) finalDescription = `Claimed top floor on GeTopFloor skyscraper.`;

      if (finalLogoUrl) {
        try {
          finalLogoUrl = await persistImageToBlob(finalLogoUrl, "logo");
        } catch {}
      }

      const cleanEmail = validated.customerEmail?.toLowerCase().trim() || null;
      const cleanPhone = validated.customerPhone?.trim() || null;
      const finalPrice = Math.max(1, validated.price);

      const preparedInput: ClaimFloorPreparedInput = {
        paymentId: validated.paymentId,
        checkoutSessionId: validated.checkoutSessionId,
        companyName: finalCompanyName,
        companyUrl: cleanUrl,
        category: finalCategory,
        price: finalPrice,
        tagline: finalTagline,
        description: finalDescription,
        logoUrl: finalLogoUrl,
        customerName: validated.customerName || null,
        customerEmail: cleanEmail,
        customerPhone: cleanPhone,
      };

      const result = await FloorsModel.claimTopFloorTransaction(preparedInput);

      try {
        revalidateTag("floors");
        if (cleanEmail) revalidateTag(`floors-owner-${cleanEmail}`);
      } catch {}

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to claim top floor",
      };
    }
  }
}
