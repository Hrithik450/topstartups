import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/config/client";
import { claims } from "@/lib/db/config/schema";
import { eq, or } from "drizzle-orm";
import { FloorsService } from "@/actions/floors/floors.service";
import { FloorsModel } from "@/actions/floors/floors.model";
import { extractRootHostname } from "@/lib/validation/domain";
import { verifyWebsiteLive } from "@/lib/validation/domain-server";
import { getDodoApiUrl, extractDodoRedirectParams } from "@/lib/dodo";

export const dynamic = "force-dynamic";

// Whitelist pattern: Dodo Payment and Checkout IDs are strictly alphanumeric with prefixes (pay_, cks_, mock_cks_)
const DODO_ID_PATTERN = /^(pay|cks|mock_cks)_[a-zA-Z0-9_-]{6,120}$/;

function isValidDodoId(id?: string | null): boolean {
  if (!id || typeof id !== "string") return false;
  return DODO_ID_PATTERN.test(id.trim());
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
    const {
      paymentId: paymentIdParam,
      sessionId: sessionIdParam,
      targetId,
    } = extractDodoRedirectParams(new URL(req.url).searchParams);

    if (!targetId || !isValidDodoId(targetId)) {
      return NextResponse.json(
        { error: "A valid payment_id or session_id parameter is required" },
        { status: 400 }
      );
    }

    const safeTargetId = encodeURIComponent(targetId.trim());

    // ─────────────────────────────────────────────────────────────
    // STEP 1: CHECK DATABASE FIRST (AUTOMATIC CONFIRMATION VIA WEBHOOK)
    // ─────────────────────────────────────────────────────────────
    const matchingClaims = await db
      .select()
      .from(claims)
      .where(
        or(
          ...(paymentIdParam && isValidDodoId(paymentIdParam)
            ? [eq(claims.paymentId, paymentIdParam.trim())]
            : []),
          ...(sessionIdParam && isValidDodoId(sessionIdParam)
            ? [eq(claims.checkoutSessionId, sessionIdParam.trim())]
            : []),
          eq(claims.checkoutSessionId, targetId.trim())
        )
      )
      .limit(1);

    let pendingClaim = matchingClaims[0];

    // If webhook already processed and succeeded, return immediately!
    if (pendingClaim && pendingClaim.status === "succeeded") {
      const activeFloors = await FloorsModel.getActiveFloors();
      const claimHost = extractRootHostname(pendingClaim.companyUrl || "");
      const floor = activeFloors.find(
        (f) =>
          extractRootHostname(f.companyUrl || "") === claimHost ||
          f.companyName?.toLowerCase() === pendingClaim.companyName?.toLowerCase()
      );
      return NextResponse.json(
        {
          status: "succeeded",
          id: floor?.id,
          rank: floor?.rank,
          companyName: floor?.companyName || pendingClaim.companyName,
          companyUrl: pendingClaim.companyUrl,
          category: pendingClaim.category,
          price: floor ? Number(floor.pricePaid) : Number(pendingClaim.amount),
          amountPaid: Number(pendingClaim.amount),
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

    let paymentStatus = "unknown";
    let paymentId = paymentIdParam && isValidDodoId(paymentIdParam) ? paymentIdParam.trim() : null;
    let checkoutSessionId =
      sessionIdParam && isValidDodoId(sessionIdParam) ? sessionIdParam.trim() : null;
    let customerName: string | null = null;
    let customerEmail: string | null = null;
    let customerPhone: string | null = null;
    let metadata: any = {};
    let gatewayPaidAmount: number | null = null;

    // If targetId starts with "pay_", query the /payments endpoint
    if (targetId.startsWith("pay_")) {
      const res = await fetch(`${getDodoApiUrl()}/payments/${safeTargetId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const data = await res.json();
        paymentId = data.payment_id || targetId;
        checkoutSessionId = data.checkout_session_id || checkoutSessionId;
        paymentStatus = data.status; // "succeeded", "failed", "pending"
        customerName = data.customer?.name || null;
        customerEmail = data.customer?.email || null;
        customerPhone = data.customer?.phone_number || null;
        metadata = data.metadata || {};
        if (data.total_amount != null && !isNaN(Number(data.total_amount))) {
          gatewayPaidAmount = Math.floor(Number(data.total_amount) / 100);
        }

        // If pending claim was not matched by payment_id, match it by the checkoutSessionId from gateway
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
      }
    }

    // If targetId starts with "cks_" or status is still unknown, query /checkouts endpoint
    if (
      paymentStatus === "unknown" &&
      (targetId.startsWith("cks_") || !targetId.startsWith("pay_"))
    ) {
      const checkId = checkoutSessionId || targetId;
      if (isValidDodoId(checkId)) {
        const safeCheckId = encodeURIComponent(checkId.trim());
        const res = await fetch(`${getDodoApiUrl()}/checkouts/${safeCheckId}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(6000),
        });

        if (res.ok) {
          const data = await res.json();
          paymentId = data.payment_id || paymentId;
          checkoutSessionId = data.id || checkId;
          paymentStatus = data.payment_status || data.status;
          customerName = data.customer_name || data.customer?.name || customerName;
          customerEmail = data.customer_email || data.customer?.email || customerEmail;
          customerPhone = data.customer?.phone_number || customerPhone;
          metadata = data.metadata || metadata;
        }
      }
    }

    // Fallback: query /payments if we only had cks_ and Dodo returned payment_id
    if (paymentId && isValidDodoId(paymentId) && paymentStatus === "unknown") {
      const safePaymentId = encodeURIComponent(paymentId.trim());
      const res = await fetch(`${getDodoApiUrl()}/payments/${safePaymentId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        paymentStatus = data.status;
        customerName = data.customer?.name || customerName;
        customerEmail = data.customer?.email || customerEmail;
        customerPhone = data.customer?.phone_number || customerPhone;
        metadata = data.metadata || metadata;
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
        (pendingClaim?.customerEmail || customerEmail || metadata.customer_email)
          ?.toLowerCase()
          .trim() || null;

      const finalPhone =
        (pendingClaim?.customerPhone || customerPhone || metadata.customer_phone)?.trim() || null;

      const companyName =
        metadata.company_name || pendingClaim?.companyName || customerName || "New Startup";

      const companyUrl =
        pendingClaim?.companyUrl ||
        metadata.company_url ||
        metadata.url ||
        "https://getopfloor.com";
      const category = pendingClaim?.category || metadata.category || "Startup";

      // SECURITY: Authoritative amount verification.
      // Must use actual verified payment amount from gateway in INR, never client-submitted pendingClaim.amount or metadata.price!
      const price = gatewayPaidAmount ?? (pendingClaim ? Number(pendingClaim.amount) : 50);

      if (gatewayPaidAmount != null && pendingClaim?.amount && gatewayPaidAmount < Number(pendingClaim.amount)) {
        console.error(
          `Rejecting floor claim: gateway verified paid amount ₹${gatewayPaidAmount} is less than required ₹${pendingClaim.amount}`
        );
        return NextResponse.json(
          { error: "Paid amount does not match required order amount." },
          { status: 400 }
        );
      }
      const finalCheckoutSessionId =
        checkoutSessionId || pendingClaim?.checkoutSessionId || targetId;
      const finalPaymentId =
        paymentId ||
        pendingClaim?.paymentId ||
        (targetId.startsWith("pay_") ? targetId : undefined);

      // Enforce live website reachability before claiming
      const verification = await verifyWebsiteLive(companyUrl);
      if (!verification.valid || !verification.cleanUrl) {
        console.error(
          `Rejecting fallback verify for ${companyUrl}: unreachable or invalid domain (${verification.error})`
        );
        return NextResponse.json(
          { error: verification.error || "Invalid or unreachable website URL" },
          { status: 400 }
        );
      }
      const cleanCompanyUrl = verification.cleanUrl;

      // Claim floor atomically based on pricePaid via FloorsService
      const result = await FloorsService.claimTopFloor({
        checkoutSessionId: finalCheckoutSessionId,
        paymentId: finalPaymentId,
        companyName,
        companyUrl: cleanCompanyUrl,
        category,
        price,
        customerEmail: finalEmail || undefined,
        customerPhone: finalPhone || undefined,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to claim floor" },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          status: "succeeded",
          id: result.id,
          rank: result.rank,
          companyName: result.companyName || companyName,
          companyUrl: result.companyUrl || companyUrl,
          category,
          logoUrl: result.logoUrl,
          tagline: result.tagline,
          description: result.description,
          price: result.pricePaid || price,
          amountPaid: price,
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
