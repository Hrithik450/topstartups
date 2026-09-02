import { UsersModel } from "./users.model";
import { User, UserResponse, UserWithProducts } from "./users.types";

export class UsersService {
  static async getOrCreateUser(
    email: string,
    name?: string,
    phone?: string
  ): Promise<UserResponse<User>> {
    try {
      if (!email?.trim()) {
        return { success: false, error: "Valid email is required" };
      }
      const data = await UsersModel.getOrCreateUser(email, name, phone);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get or create user",
      };
    }
  }

  static async getUserByEmail(email: string): Promise<UserResponse<User>> {
    try {
      if (!email?.trim()) return { success: false, error: "Email is required" };
      const data = await UsersModel.getUserByEmail(email);
      if (!data) return { success: false, error: "User not found" };
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch user",
      };
    }
  }

  static async updateUser(
    id: number,
    data: { name?: string; phone?: string; avatarUrl?: string }
  ): Promise<UserResponse<User>> {
    try {
      const updated = await UsersModel.updateUser(id, data);
      if (!updated) return { success: false, error: "User not found" };
      return { success: true, data: updated };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update user",
      };
    }
  }

  static async getAllUsersWithProducts(): Promise<UserResponse<UserWithProducts[]>> {
    try {
      const data = await UsersModel.getAllUsersWithProducts();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch users",
      };
    }
  }
}
