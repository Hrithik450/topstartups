import { NextRequest, NextResponse } from "next/server";
import { createDodoCheckout } from "@/lib/dodo";
import { db } from "@/lib/db/config/client";
import { claims } from "@/lib/db/config/schema";
import { extractRootHostname } from "@/lib/validation/domain";
import { verifyWebsiteLive } from "@/lib/validation/domain-server";
import { verifyFounderEmail } from "@/lib/validation/email";
import { FloorsService } from "@/actions/floors/floors.service";

export const dynamic = "force-dynamic";

/** SECURITY: Strip HTML brackets, control characters, and quotes to prevent HTML/script injection without regex backtracking */
function sanitizeText(input: string, maxLength = 255): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/[<>"'&`\x00-\x1F\x7F]/g, "")
    .trim()
    .slice(0, maxLength);
}

/** SECURITY: Validate return origin to allow custom domains, vercel previews, and localhost */
function isAllowedOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") return true;
    if (parsed.hostname === "getopfloor.com" || parsed.hostname.endsWith(".getopfloor.com"))
      return true;
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

    const { url, category, price, customerName, customerEmail } = body;

    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ error: "Website URL is required." }, { status: 400 });
    }

    const targetUrl = url.trim();

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
    // Canonical company name is the domain (e.g. "stripe.com", "linear.app") extracted directly from the verified URL
    const companyName = extractRootHostname(verification.domain || cleanUrl).toLowerCase();

    // ─────────────────────────────────────────────────────────────
    // STEP 2: MANDATORY FOUNDER EMAIL VALIDATION & REACHABILITY
    // ─────────────────────────────────────────────────────────────
    if (!customerEmail || typeof customerEmail !== "string" || !customerEmail.trim()) {
      return NextResponse.json(
        {
          error:
            "Founder email address is required for ownership verification and floor management.",
        },
        { status: 400 }
      );
    }

    const emailCheck = await verifyFounderEmail(customerEmail);
    if (!emailCheck.valid || !emailCheck.email) {
      return NextResponse.json(
        {
          error:
            emailCheck.error ||
            "Please provide a valid, deliverable email address (e.g. founder@yourcompany.com).",
        },
        { status: 400 }
      );
    }
    const userEmail = emailCheck.email;

    // ─────────────────────────────────────────────────────────────
    // STEP 3: DYNAMIC OUTBID PRICING CALCULATION (BY DOMAIN)
    // ─────────────────────────────────────────────────────────────
    const { topFloorPrice } = await FloorsService.getOutbidPricing(companyName);

    // Bare minimum payment allowed is ₹50 (unlimited upper bound)
    const MIN_PLATFORM_PRICE = 50;
    const submittedPrice = Number(price);
    if (isNaN(submittedPrice) || submittedPrice < MIN_PLATFORM_PRICE) {
      return NextResponse.json(
        {
          error: `Minimum payment amount required is ₹${MIN_PLATFORM_PRICE}.`,
          minRequiredPrice: MIN_PLATFORM_PRICE,
          topFloorPrice,
        },
        { status: 400 }
      );
    }

    // Final checkout payment amount
    const amount = Math.min(1000000, submittedPrice);
    const cleanCategory = sanitizeText(category.trim(), 128);

    // Determine return origin
    const hostHeader = req.headers.get("host") || "getopfloor.com";
    const protoHeader =
      req.headers.get("x-forwarded-proto") ||
      (hostHeader.startsWith("localhost") ? "http" : "https");
    const candidateOrigin = `${protoHeader}://${hostHeader}`;
    const origin = isAllowedOrigin(candidateOrigin)
      ? candidateOrigin
      : process.env.NEXT_PUBLIC_BASE_URL || "https://getopfloor.com";

    // Determine customer personal name for billing invoice:
    let cleanCustomerName: string | undefined = undefined;
    if (customerName && typeof customerName === "string" && customerName.trim()) {
      const cleanCandidate = customerName.trim();
      if (!cleanCandidate.includes(".") && !cleanCandidate.includes("/")) {
        cleanCustomerName = sanitizeText(cleanCandidate, 100);
      }
    }

    if (!cleanCustomerName && userEmail) {
      const emailName = userEmail
        .split("@")[0]
        .replace(/[^a-zA-Z0-9 ]/g, " ")
        .trim();
      cleanCustomerName = emailName
        ? emailName.charAt(0).toUpperCase() + emailName.slice(1)
        : "Customer";
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 4: CREATE DODO CHECKOUT SESSION & INSERT PENDING CLAIM
    // ─────────────────────────────────────────────────────────────
    const checkout = await createDodoCheckout({
      url: cleanUrl,
      category: cleanCategory,
      customerName: cleanCustomerName,
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
        companyName,
        companyUrl: cleanUrl,
        category: cleanCategory,
        amount,
        currency: "INR",
        customerName: cleanCustomerName,
        customerEmail: userEmail,
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
