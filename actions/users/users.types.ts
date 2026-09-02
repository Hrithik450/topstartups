import { type User, type NewUser } from "@/lib/db/schema";

export type { User, NewUser };

export interface UserProduct {
  id: number;
  rank: number;
  companyName: string;
  url: string;
  category: string | null;
  pricePaid: number;
  claimedAt: Date | null;
}

export interface UserWithProducts {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  createdAt: Date;
  productCount: number;
  products: UserProduct[];
}

export interface UserResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
