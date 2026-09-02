import { NextRequest, NextResponse } from "next/server";
import { createDodoCheckout } from "@/lib/dodo";
import { db } from "@/lib/db/client";
import { claims } from "@/lib/db/schema";
import { verifyWebsiteLive } from "@/lib/validation/domain";

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
    const body = await req.json();
    const { url, category, companyName, price, customerEmail } = body;

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

    // SECURITY: Validate email format if provided
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (customerEmail && !emailRegex.test(customerEmail.trim())) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const amount = Math.max(50, Math.min(100000, Number(price) || 50));

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
      price: amount,
      customerEmail: customerEmail?.trim(),
      returnUrl: origin,
    });

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
        customerEmail: customerEmail?.trim() || null,
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
