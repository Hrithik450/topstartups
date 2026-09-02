import { NextRequest } from "next/server";
import { handleGoogleOAuthCallback } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleGoogleOAuthCallback(req);
}
