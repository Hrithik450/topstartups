import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { emailOtps } from "@/lib/db/schema";
import { getFloorsByEmail } from "@/lib/db/floors";
import { sendOtpEmail } from "@/lib/email/brevo";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if any claimed floors are associated with this email
    const ownedFloors = await getFloorsByEmail(cleanEmail);
    if (ownedFloors.length === 0) {
      return NextResponse.json(
        {
          error:
            "No active skyscraper floors found under this email. Please ensure you enter the email used during checkout.",
        },
        { status: 404 }
      );
    }

    // Generate secure 6-digit numeric OTP code
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete existing stale OTPs for this email using pure Drizzle
    await db.delete(emailOtps).where(eq(emailOtps.email, cleanEmail));

    // Insert new OTP record
    await db.insert(emailOtps).values({
      email: cleanEmail,
      code,
      expiresAt,
    });

    // Send email via Brevo (or log to console in dev mode)
    const emailResult = await sendOtpEmail({
      email: cleanEmail,
      code,
      companyName: ownedFloors[0]?.companyName,
    });

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}.`,
      floorCount: ownedFloors.length,
      devMode: emailResult.devMode ?? false,
    });
  } catch (err: any) {
    console.error("Error sending OTP:", err);
    return NextResponse.json(
      { error: "Failed to send verification code. Please try again." },
      { status: 500 }
    );
  }
}
