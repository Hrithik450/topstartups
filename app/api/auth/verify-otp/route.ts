import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/config/client";
import { emailOtps } from "@/lib/db/config/schema";
import { getFloorsByEmail } from "@/lib/db/floors";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function createSessionSignature(email: string): string {
  const secret = process.env.SESSION_SECRET || "getopfloor_secure_session_secret";
  return crypto.createHmac("sha256", secret).update(email.toLowerCase().trim()).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and verification code are required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.toString().trim();

    // Verify OTP against database using pure Drizzle
    const matching = await db
      .select()
      .from(emailOtps)
      .where(
        and(
          eq(emailOtps.email, cleanEmail),
          eq(emailOtps.code, cleanCode),
          gt(emailOtps.expiresAt, new Date())
        )
      )
      .limit(1);

    if (matching.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired verification code. Please request a new code." },
        { status: 401 }
      );
    }

    // Delete used OTP using pure Drizzle
    await db.delete(emailOtps).where(eq(emailOtps.email, cleanEmail));

    // Create session verification token
    const token = createSessionSignature(cleanEmail);

    // Fetch all floors owned by this email
    const floors = await getFloorsByEmail(cleanEmail);

    // Fetch or create user record in users table
    const { getOrCreateUser } = await import("@/lib/db/users");
    const user = await getOrCreateUser(cleanEmail);

    return NextResponse.json({
      success: true,
      email: cleanEmail,
      sessionToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      floors,
    });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    return NextResponse.json(
      { error: "Failed to verify code. Please try again." },
      { status: 500 }
    );
  }
}
