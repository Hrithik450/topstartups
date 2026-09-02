import { type Floor, type NewFloor } from "@/lib/db/schema";

export type { Floor, NewFloor };

export interface ClaimFloorInput {
  paymentId: string;
  companyName: string;
  url: string;
  category?: string;
  price: number;
  tagline?: string;
  description?: string;
  logoUrl?: string;
  customerEmail?: string;
  customerPhone?: string;
  manageToken?: string;
}

export interface UpdateFloorInput {
  companyName?: string;
  url?: string;
  category?: string;
  tagline?: string;
  description?: string;
  logoUrl?: string;
}

export interface FloorResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
