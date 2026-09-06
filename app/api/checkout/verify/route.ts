import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/config/client";
import { claims } from "@/lib/db/config/schema";
import { eq, or } from "drizzle-orm";
import { FloorsService } from "@/actions/floors/floors.service";
import { FloorsModel } from "@/actions/floors/floors.model";
import { extractRootHostname } from "@/lib/validation/domain";
import { getDodoApiUrl } from "@/lib/dodo";

export const dynamic = "force-dynamic";

// Dodo Payment IDs start with pay_ (or mock_ for local testing)
const DODO_PAYMENT_ID_PATTERN = /^(pay|mock)_[a-zA-Z0-9_-]{4,120}$/;

function isValidPaymentId(id?: string | null): boolean {
  if (!id || typeof id !== "string") return false;
  return DODO_PAYMENT_ID_PATTERN.test(id.trim());
}

/** SECURITY: Mask email to prevent PII exposure in public verification responses */
function maskEmail(email?: string | null): string | null {
  if (!email || typeof email !== "string") return null;
  const clean = email.trim();
  const atIdx = clean.indexOf("@");
  if (atIdx <= 0) return null;
  const local = clean.slice(0, atIdx);
  const domain = clean.slice(atIdx + 1);
  const visible = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1);
  return `${visible}***@${domain}`;
}

export async function GET(req: NextRequest) {
  try {
    const paymentId = req.nextUrl.searchParams.get("payment_id")?.trim();

    if (!paymentId || !isValidPaymentId(paymentId)) {
      return NextResponse.json(
        { error: "A valid payment_id parameter is required." },
        { status: 400 }
      );
    }

    const safePaymentId = encodeURIComponent(paymentId);

    // ─────────────────────────────────────────────────────────────
    // STEP 1: CHECK DATABASE FIRST (AUTOMATIC CONFIRMATION VIA WEBHOOK)
    // ─────────────────────────────────────────────────────────────
    const matchingClaims = await db
      .select()
      .from(claims)
      .where(eq(claims.paymentId, paymentId))
      .limit(1);

    let pendingClaim = matchingClaims[0];

    // If webhook already processed and succeeded, return immediately!
    if (pendingClaim && pendingClaim.status === "succeeded") {
      const claimHost = extractRootHostname(pendingClaim.companyUrl || "");
      const floor = await FloorsModel.findFloorByHost(claimHost);
      return NextResponse.json(
        {
          status: "succeeded",
          id: floor?.id,
          companyName: floor?.companyName || pendingClaim.companyName,
          customerName: pendingClaim.customerName || null,
          companyUrl: pendingClaim.companyUrl,
          category: pendingClaim.category,
          pricePaid: floor ? Number(floor.pricePaid) : Number(pendingClaim.amount),
          customerEmail: maskEmail(pendingClaim.customerEmail),
          logoUrl: floor?.logoUrl,
          tagline: floor?.tagline,
          description: floor?.description,
          isUpdate: Boolean(floor),
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
        }
      );
    }

    // If claim was already marked failed
    if (pendingClaim && pendingClaim.status === "failed") {
      return NextResponse.json({
        status: "failed",
        error: "Payment was not completed.",
      });
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 2: FALLBACK TO DODO API ONLY IF WEBHOOK HASN'T CONFIRMED YET
    // ─────────────────────────────────────────────────────────────
    const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({
        status: pendingClaim?.status || "pending",
        message: "Waiting for payment confirmation...",
      });
    }

    const res = await fetch(`${getDodoApiUrl()}/payments/${safePaymentId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return NextResponse.json({
        status: pendingClaim?.status || "pending",
        message: "Payment is being processed.",
      });
    }

    const data = await res.json();
    const paymentStatus = data.status; // "succeeded", "failed", "cancelled", "pending"
    const checkoutSessionId = data.checkout_session_id || null;
    const metadata = data.metadata || {};

    // If pending claim was not matched by paymentId, lookup by checkout_session_id from gateway
    if (!pendingClaim && checkoutSessionId) {
      try {
        const claimsBySession = await db
          .select()
          .from(claims)
          .where(eq(claims.checkoutSessionId, checkoutSessionId.trim()))
          .limit(1);
        if (claimsBySession[0]) {
          pendingClaim = claimsBySession[0];
        }
      } catch (err) {
        console.warn("Could not lookup claim by checkoutSessionId:", err);
      }
    }

    // If Dodo says failed, cancelled, or expired
    if (
      paymentStatus === "failed" ||
      paymentStatus === "cancelled" ||
      paymentStatus === "expired"
    ) {
      if (pendingClaim && pendingClaim.status === "pending") {
        await db
          .update(claims)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(claims.id, pendingClaim.id));
      }
      return NextResponse.json({
        status: "failed",
        error: "Payment was not completed.",
      });
    }

    // If Dodo says succeeded (manual fallback succeeded)
    if (paymentStatus === "succeeded") {
      const finalEmail =
        (pendingClaim?.customerEmail || data.customer?.email || metadata.customer_email)
          ?.toLowerCase()
          .trim() || null;

      const finalPhone =
        (
          pendingClaim?.customerPhone ||
          data.customer?.phone_number ||
          metadata.customer_phone
        )?.trim() || null;

      const finalCustomerName =
        (pendingClaim?.customerName || data.customer?.name || metadata.customer_name)?.trim() ||
        null;

      const rawAmount = data.total_amount ?? data.amount;
      const gatewayPaidAmount =
        rawAmount != null && !isNaN(Number(rawAmount)) ? Math.floor(Number(rawAmount) / 100) : null;

      const price = gatewayPaidAmount ?? (pendingClaim ? Number(pendingClaim.amount) : 50);

      if (
        gatewayPaidAmount != null &&
        pendingClaim?.amount &&
        gatewayPaidAmount < Number(pendingClaim.amount)
      ) {
        console.error(
          `Rejecting floor claim: gateway verified paid amount ₹${gatewayPaidAmount} is less than required ₹${pendingClaim.amount}`
        );
        return NextResponse.json(
          { error: "Paid amount does not match required order amount." },
          { status: 400 }
        );
      }

      const companyUrl =
        pendingClaim?.companyUrl ||
        metadata.url ||
        metadata.company_url ||
        "https://getopfloor.com";
      const companyName =
        pendingClaim?.companyName || metadata.company_name || extractRootHostname(companyUrl);
      const category = pendingClaim?.category || metadata.category || "Startup";

      const finalCheckoutSessionId =
        checkoutSessionId || pendingClaim?.checkoutSessionId || paymentId;

      // Claim floor atomically based on pricePaid via FloorsService
      const result = await FloorsService.claimTopFloor({
        checkoutSessionId: finalCheckoutSessionId,
        paymentId,
        companyName,
        companyUrl,
        category,
        price,
        customerName: finalCustomerName || undefined,
        customerEmail: finalEmail || undefined,
        customerPhone: finalPhone || undefined,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to claim floor" },
          { status: 500 }
        );
      }

      // Explicitly mark claim record status as succeeded in claims table
      try {
        await db
          .update(claims)
          .set({
            status: "succeeded",
            paymentId,
            customerName: finalCustomerName || pendingClaim?.customerName,
            customerEmail: finalEmail || pendingClaim?.customerEmail,
            customerPhone: finalPhone || pendingClaim?.customerPhone,
            updatedAt: new Date(),
          })
          .where(
            or(
              ...(pendingClaim?.id ? [eq(claims.id, pendingClaim.id)] : []),
              eq(claims.paymentId, paymentId),
              ...(checkoutSessionId ? [eq(claims.checkoutSessionId, checkoutSessionId)] : [])
            )
          );
      } catch (claimDbErr) {
        console.warn("Could not mark claim succeeded by ID in DB:", claimDbErr);
      }

      return NextResponse.json(
        {
          status: "succeeded",
          id: result.id,
          companyName: result.companyName || companyName,
          customerName: finalCustomerName || null,
          companyUrl: result.companyUrl || companyUrl,
          category,
          logoUrl: result.logoUrl,
          tagline: result.tagline,
          description: result.description,
          pricePaid: result.pricePaid || price,
          customerEmail: maskEmail(finalEmail),
          isUpdate: result.isUpdate,
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
        }
      );
    }

    return NextResponse.json({
      status: paymentStatus || "pending",
      message: "Payment is being processed.",
    });
  } catch (err: any) {
    console.error("Error verifying payment:", err);
    return NextResponse.json({ error: "Failed to verify payment status." }, { status: 500 });
  }
}
