import { NextRequest, NextResponse } from "next/server";
import { createDodoCheckout } from "@/lib/dodo";
import { db } from "@/lib/db/config/client";
import { claims } from "@/lib/db/config/schema";
import { verifyWebsiteLive, extractRootHostname } from "@/lib/validation/domain";
import { auth } from "@/lib/auth/auth";
import { FloorsService } from "@/actions/floors/floors.service";

import { UserModel } from "@/actions/user/user.model";

export const dynamic = "force-dynamic";

/** SECURITY: Strip HTML/script tags and limit length */
function sanitizeText(input: string, maxLength = 255): string {
  return input
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, maxLength);
}

/** SECURITY: Validate return origin to allow custom domains, vercel previews, and localhost */
function isAllowedOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") return true;
    if (parsed.hostname === "getopfloor.com" || parsed.hostname.endsWith(".getopfloor.com")) return true;
    if (parsed.hostname.endsWith(".vercel.app")) return true;
    if (process.env.NEXT_PUBLIC_BASE_URL) {
      try {
        if (new URL(process.env.NEXT_PUBLIC_BASE_URL).hostname === parsed.hostname) return true;
      } catch {}
    }
    return false;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyUrl, url, category, companyName, price } = body;
    const targetUrl = (companyUrl || url || "").trim();

    if (!targetUrl || typeof targetUrl !== "string") {
      return NextResponse.json({ error: "Website URL is required" }, { status: 400 });
    }

    if (!category || typeof category !== "string" || !category.trim()) {
      return NextResponse.json({ error: "Category is required." }, { status: 400 });
    }

    const verification = await verifyWebsiteLive(targetUrl);
    if (!verification.valid || !verification.cleanUrl) {
      return NextResponse.json(
        {
          error:
            verification.error ||
            "Insecure or unreachable website URL. Please provide an active HTTPS website.",
        },
        { status: 400 }
      );
    }

    const cleanUrl = verification.cleanUrl;
    const cleanHost = extractRootHostname(verification.domain || cleanUrl);

    // ─────────────────────────────────────────────────────────────
    // STEP 2: AUTHENTICATION CHECK SECOND
    // Must be logged in to claim/outbid on the skyscraper
    // ─────────────────────────────────────────────────────────────
    const session = await auth();
    const userEmail =
      session?.user?.email?.toLowerCase().trim() || body.customerEmail?.trim()?.toLowerCase();
    if (!userEmail) {
      return NextResponse.json(
        { error: "Please sign in with Google to claim a floor on the skyscraper." },
        { status: 401 }
      );
    }
    const userId = session?.user?.id || null;

    // ─────────────────────────────────────────────────────────────
    // STEP 3: DYNAMIC OUTBID PRICING CALCULATION (DIRECT FROM SERVICE)
    // ─────────────────────────────────────────────────────────────
    const { minRequiredPrice, topFloorPrice } = await FloorsService.getOutbidPricing(
      cleanHost,
      userEmail,
      userId
    );

    // User can enter ANY amount >= minRequiredPrice (variable, unlimited upper bound)
    const submittedPrice = Number(price);
    if (isNaN(submittedPrice) || submittedPrice < minRequiredPrice) {
      return NextResponse.json(
        {
          error: `Minimum outbid amount required is ₹${minRequiredPrice}.`,
          minRequiredPrice,
          topFloorPrice,
        },
        { status: 400 }
      );
    }

    // Final checkout payment amount
    const amount = Math.min(1000000, submittedPrice);

    // SECURITY: Validate and sanitize company name and category
    const rawName =
      companyName && typeof companyName === "string" && companyName.trim()
        ? companyName.trim().toLowerCase()
        : cleanHost.toLowerCase();
    const name = sanitizeText(rawName, 100);
    const cleanCategory = sanitizeText(category.trim(), 128);

    // Determine return origin
    const hostHeader = req.headers.get("host") || "getopfloor.com";
    const protoHeader =
      req.headers.get("x-forwarded-proto") ||
      (hostHeader.startsWith("localhost") ? "http" : "https");
    const candidateOrigin = `${protoHeader}://${hostHeader}`;
    const origin = isAllowedOrigin(candidateOrigin)
      ? candidateOrigin
      : (process.env.NEXT_PUBLIC_BASE_URL || "https://getopfloor.com");

    // Determine customer personal name for billing invoice:
    // Only pass real personal names from session, DB, or explicit input.
    // Never fallback to company URL or domain name!
    let customerName: string | undefined = undefined;
    const candidateName = session?.user?.name || body.customerName;
    if (candidateName && typeof candidateName === "string" && candidateName.trim()) {
      const cleanCandidate = candidateName.trim();
      if (!cleanCandidate.includes(".") && !cleanCandidate.includes("/")) {
        customerName = sanitizeText(cleanCandidate, 100);
      }
    }

    if (!customerName && userEmail) {
      try {
        const userRecord = await UserModel.getUserByEmail(userEmail);
        if (userRecord?.name && userRecord.name.trim() && !userRecord.name.includes(".")) {
          customerName = sanitizeText(userRecord.name.trim(), 100);
        }
      } catch {}
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 4: CREATE DODO CHECKOUT SESSION & INSERT PENDING CLAIM
    // ─────────────────────────────────────────────────────────────
    const checkout = await createDodoCheckout({
      companyUrl: cleanUrl,
      category: cleanCategory,
      companyName: name,
      customerName,
      price: amount,
      customerEmail: userEmail,
      returnUrl: origin,
    });

    const checkoutSessionId = checkout.checkoutSessionId;

    // Insert pending row in claims table
    try {
      await db.insert(claims).values({
        checkoutSessionId,
        paymentId: null, // payment_id is created by Dodo upon payment completion
        status: "pending",
        companyName: name,
        companyUrl: cleanUrl,
        category: cleanCategory,
        amount,
        currency: "INR",
        customerEmail: userEmail,
        userId: userId,
        checkoutUrl: checkout.checkoutUrl,
        updatedAt: new Date(),
      });
    } catch (dbErr) {
      console.warn("Could not record pending claim to database immediately:", dbErr);
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 5: RETURN CHECKOUT URL FOR CLIENT REDIRECT
    // ─────────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      checkoutSessionId,
      checkoutUrl: checkout.checkoutUrl,
      isMock: checkout.isMock ?? false,
    });
  } catch (err: any) {
    console.error("Error initiating checkout:", err);
    return NextResponse.json(
      { error: err?.message || "Could not start checkout. Please try again." },
      { status: 500 }
    );
  }
}
