import { NextRequest, NextResponse } from "next/server";
import { createDodoCheckout } from "@/lib/dodo";
import { db } from "@/lib/db/config/client";
import { claims } from "@/lib/db/config/schema";
import { verifyWebsiteLive } from "@/lib/validation/domain";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { acquireFloorLock } from "@/lib/db/locks";

export const dynamic = "force-dynamic";

/** SECURITY: Strip HTML/script tags and limit length */
function sanitizeText(input: string, maxLength = 255): string {
  return input.replace(/<[^>]*>/g, "").trim().slice(0, maxLength);
}

/** SECURITY: Whitelist of allowed return origins to prevent Host header injection */
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_BASE_URL || "https://getopfloor.com",
  "http://localhost:3000",
  "http://localhost:3001",
];

export async function POST(req: NextRequest) {
  try {
    const session = getAuthenticatedUser(req);
    const body = await req.json();
    const { url, category, companyName, price } = body;
    const targetRank = Math.max(1, Math.min(50, Number(body.targetRank || body.rank) || 1));

    // Input validation & Live Security Verification
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Website URL is required" }, { status: 400 });
    }

    const verification = await verifyWebsiteLive(url);
    if (!verification.valid || !verification.cleanUrl) {
      return NextResponse.json(
        { error: verification.error || "Insecure or invalid website URL" },
        { status: 400 }
      );
    }

    const cleanUrl = verification.cleanUrl;

    // SECURITY: Validate and sanitize text inputs
    const name = sanitizeText(
      companyName?.trim() || cleanUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    );
    if (name.length < 1 || name.length > 255) {
      return NextResponse.json({ error: "Company name must be 1-255 characters" }, { status: 400 });
    }

    const cleanCategory = sanitizeText(category || "Startup", 128);

    // Prefer authenticated Google email
    const finalEmail = session?.email || body.customerEmail?.trim() || null;
    const finalUserId = session?.id || null;

    const amount = Math.max(50, Math.min(100000, Number(price) || 50));

    // CONCURRENCY LOCK: Reserve floor rank for 5 minutes during checkout
    const lockResult = await acquireFloorLock({
      targetRank,
      email: finalEmail,
      companyName: name,
      durationSeconds: 300,
    });

    if (!lockResult.success) {
      return NextResponse.json(
        {
          error:
            lockResult.message ||
            `Floor #${targetRank} is currently being claimed. Please wait a moment until the transaction finishes or expires.`,
          isLocked: true,
          secondsRemaining: lockResult.secondsRemaining,
        },
        { status: 409 }
      );
    }

    // SECURITY: Determine return origin from whitelisted origins, not from headers
    const hostHeader = req.headers.get("host") || "localhost:3000";
    const protoHeader = req.headers.get("x-forwarded-proto") || (hostHeader.startsWith("localhost") ? "http" : "https");
    const candidateOrigin = `${protoHeader}://${hostHeader}`;
    const origin = ALLOWED_ORIGINS.includes(candidateOrigin) ? candidateOrigin : ALLOWED_ORIGINS[0];

    // Create Dodo Payments checkout session
    const checkout = await createDodoCheckout({
      url: cleanUrl,
      category: cleanCategory,
      companyName: name,
      customerName: session?.name || (body.customerName && body.customerName !== name ? body.customerName.trim() : undefined),
      price: amount,
      customerEmail: finalEmail || undefined,
      returnUrl: origin,
    });

    // Update lock with exact payment session ID
    if (checkout.paymentId) {
      await acquireFloorLock({
        targetRank,
        email: finalEmail,
        paymentId: checkout.paymentId,
        companyName: name,
        durationSeconds: 300,
      });
    }

    // Record pending claim in database
    try {
      await db.insert(claims).values({
        paymentId: checkout.paymentId,
        status: "pending",
        companyName: name,
        url: cleanUrl,
        category: cleanCategory,
        amount,
        currency: "INR",
        customerEmail: finalEmail,
        userId: finalUserId,
        checkoutUrl: checkout.checkoutUrl,
      });
    } catch (dbErr) {
      console.warn("Could not record pending claim to database immediately:", dbErr);
    }

    return NextResponse.json({
      success: true,
      paymentId: checkout.paymentId,
      checkoutUrl: checkout.checkoutUrl,
      isMock: checkout.isMock ?? false,
    });
  } catch (err: any) {
    console.error("Error initiating checkout:", err);
    // SECURITY: Never expose internal error messages to clients
    return NextResponse.json(
      { error: "An internal error occurred. Please try again." },
      { status: 500 }
    );
  }
}
