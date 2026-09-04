import { auth } from "@/lib/auth/auth";
import { UserModel } from "./user.model";
import type { User, Floor } from "@/lib/db/config/schema";

export type { User, Floor };

export type UserWithFloors = User & {
  floors: Floor[];
};

export interface UserResponse {
  success: boolean;
  data?: User | null;
  error?: string;
}

export interface UserWithFloorsResponse {
  success: boolean;
  data?: UserWithFloors | null;
  error?: string;
}

export interface UsersResponse {
  success: boolean;
  data?: any[];
  error?: string;
}

export class UserService {
  /**
   * Get current authenticated user session and corresponding database record.
   */
  static async getCurrentUser(): Promise<UserResponse> {
    try {
      const session = await auth();
      const rawEmail = session?.user?.email;
      if (!rawEmail?.trim()) {
        return {
          success: false,
          data: null,
          error: "No authenticated user found",
        };
      }

      const cleanEmail = rawEmail.toLowerCase().trim();
      const user = await UserModel.getUserByEmail(cleanEmail);
      if (!user) {
        return {
          success: true,
          data: {
            id: session?.user?.id || "temp",
            email: cleanEmail,
            name: session?.user?.name || null,
            emailVerified: null,
            avatarUrl: (session?.user as any)?.avatarUrl || session?.user?.image || null,
            phone: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        };
      }

      const googlePhoto =
        (session?.user as any)?.avatarUrl || session?.user?.image || user.avatarUrl || null;
      const googleName = session?.user?.name || user.name || null;

      return {
        success: true,
        data: {
          ...user,
          name: googleName,
          avatarUrl: googlePhoto,
        },
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed to fetch user session",
      };
    }
  }

  /**
   * Fetch a user profile by email (read-only).
   */
  static async getUserByEmail(email: string): Promise<UserResponse> {
    try {
      if (!email?.trim()) {
        return {
          success: false,
          data: null,
          error: "Email is required",
        };
      }

      const cleanEmail = email.toLowerCase().trim();
      const user = await UserModel.getUserByEmail(cleanEmail);
      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed to fetch user by email",
      };
    }
  }

  /**
   * Fetch a user profile along with their claimed floors by User ID (read-only).
   */
  static async getUserWithFloors(userId: string): Promise<UserWithFloorsResponse> {
    try {
      if (!userId?.trim()) {
        return {
          success: false,
          data: null,
          error: "User ID is required",
        };
      }

      const cleanUserId = userId.trim();
      const user = await UserModel.getUserWithFloors(cleanUserId);
      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed to fetch user with floors",
      };
    }
  }

  /**
   * Fetch a user profile along with their claimed floors by User Email (read-only).
   */
  static async getUserWithFloorsByEmail(email: string): Promise<UserWithFloorsResponse> {
    try {
      if (!email?.trim()) {
        return {
          success: false,
          data: null,
          error: "Email is required",
        };
      }

      const cleanEmail = email.toLowerCase().trim();
      const user = await UserModel.getUserWithFloorsByEmail(cleanEmail);
      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed to fetch user with floors",
      };
    }
  }

  /**
   * Fetch a user profile by ID (read-only).
   */
  static async getUserById(id: string): Promise<UserResponse> {
    try {
      if (!id?.trim()) {
        return {
          success: false,
          data: null,
          error: "User ID is required",
        };
      }

      const cleanId = id.trim();
      const user = await UserModel.getUserById(cleanId);
      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed to fetch user by ID",
      };
    }
  }

  /**
   * Fetch all users along with their claimed floors for administration.
   */
  static async getAllUsersWithFloors(): Promise<UsersResponse> {
    try {
      const data = await UserModel.getAllUsersWithFloors();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : "Failed to fetch users with floors",
      };
    }
  }
}
