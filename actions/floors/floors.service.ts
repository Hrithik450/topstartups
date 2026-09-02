import { FloorsModel } from "./floors.model";
import {
  ClaimFloorInput,
  UpdateFloorInput,
  FloorResponse,
  Floor,
} from "./floors.types";

export class FloorsService {
  /**
   * Fetch all 50 active skyscraper floors.
   */
  static async getActiveFloors(): Promise<FloorResponse<Floor[]>> {
    try {
      const data = await FloorsModel.getActiveFloors();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch floors",
      };
    }
  }

  /**
   * Claim top floor after payment verification.
   */
  static async claimTopFloor(input: ClaimFloorInput) {
    try {
      if (!input.paymentId || !input.companyName) {
        return { success: false, error: "Payment ID and company name are required" };
      }
      return await FloorsModel.claimTopFloor(input);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to claim top floor",
      };
    }
  }

  /**
   * Fetch all floors owned by a verified email.
   */
  static async getFloorsByEmail(email: string): Promise<FloorResponse<Floor[]>> {
    try {
      if (!email?.trim()) return { success: true, data: [] };
      const data = await FloorsModel.getFloorsByEmail(email);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch user floors",
      };
    }
  }

  /**
   * Update startup/floor details.
   */
  static async updateFloor(
    floorId: number,
    email: string,
    updates: UpdateFloorInput
  ): Promise<FloorResponse<Floor>> {
    try {
      if (!floorId || !email) {
        return { success: false, error: "Floor ID and owner email are required" };
      }
      const updated = await FloorsModel.updateFloor(floorId, email, updates);
      if (!updated) {
        return { success: false, error: "Floor not found or you are not authorized to update it" };
      }
      return { success: true, data: updated, message: "Floor updated successfully" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update floor",
      };
    }
  }

  /**
   * Vacate a floor.
   */
  static async deleteFloor(floorId: number, email: string) {
    try {
      if (!floorId || !email) {
        return { success: false, error: "Floor ID and owner email are required" };
      }
      return await FloorsModel.deleteFloor(floorId, email);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to vacate floor",
      };
    }
  }
}
