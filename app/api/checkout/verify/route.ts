import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/config/client";
import { claims } from "@/lib/db/config/schema";
import { eq, or } from "drizzle-orm";
import { claimTopFloorTransactional } from "@/lib/db/floors";
import { releaseFloorLock } from "@/lib/db/locks";

export const dynamic = "force-dynamic";

const DODO_ENV = process.env.DODO_PAYMENTS_ENVIRONMENT || "test";
const DODO_API_URL =
  DODO_ENV === "live"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentIdParam = searchParams.get("payment_id")?.trim();
    const sessionIdParam = (searchParams.get("session_id") || searchParams.get("checkout_id"))?.trim();

    const targetId = paymentIdParam || sessionIdParam;

    if (!targetId || targetId === "{CHECKOUT_ID}") {
      return NextResponse.json(
        { error: "payment_id or session_id parameter is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Payment gateway not configured" },
        { status: 500 }
      );
    }

    let paymentStatus = "unknown";
    let paymentId = paymentIdParam || null;
    let checkoutSessionId = sessionIdParam || null;
    let customerName: string | null = null;
    let customerEmail: string | null = null;
    let customerPhone: string | null = null;
    let metadata: any = {};

    // 1. If targetId starts with "pay_", query the /payments endpoint
    if (targetId.startsWith("pay_")) {
      const res = await fetch(`${DODO_API_URL}/payments/${targetId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
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
      } else {
        console.warn(`Could not query Dodo /payments/${targetId}:`, res.status);
      }
    }

    // 2. If targetId starts with "cks_" or status is still unknown, query /checkouts endpoint
    if (paymentStatus === "unknown" && (targetId.startsWith("cks_") || !targetId.startsWith("pay_"))) {
      const checkId = checkoutSessionId || targetId;
      const res = await fetch(`${DODO_API_URL}/checkouts/${checkId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
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
      } else {
        console.warn(`Could not query Dodo /checkouts/${checkId}:`, res.status);
      }
    }

    // 3. Fallback: query /payments if we only had cks_ and Dodo returned payment_id
    if (paymentId && paymentStatus === "unknown") {
      const res = await fetch(`${DODO_API_URL}/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
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

    // 4. Look up matching claim in our database (by either paymentId or checkoutSessionId)
    const matchingClaims = await db
      .select()
      .from(claims)
      .where(
        or(
          ...(paymentId ? [eq(claims.paymentId, paymentId)] : []),
          ...(checkoutSessionId ? [eq(claims.paymentId, checkoutSessionId)] : []),
          eq(claims.paymentId, targetId)
        )
      )
      .limit(1);

    const pendingClaim = matchingClaims[0];

    const targetRankToRelease = pendingClaim?.targetRank || Number(metadata.target_rank || metadata.targetRank) || 1;

    // If payment failed, cancelled, or expired
    if (paymentStatus === "failed" || paymentStatus === "cancelled" || paymentStatus === "expired") {
      await releaseFloorLock(targetRankToRelease, paymentId, checkoutSessionId);
      if (pendingClaim && pendingClaim.status === "pending") {
        await db
          .update(claims)
          .set({ status: "failed" })
          .where(eq(claims.id, pendingClaim.id));
      }
      return NextResponse.json({
        status: "failed",
        error: "Payment was not completed. The reservation has been released.",
      });
    }

    // If payment succeeded
    if (paymentStatus === "succeeded") {
      const finalEmail = (
        pendingClaim?.customerEmail ||
        customerEmail ||
        metadata.customer_email
      )?.toLowerCase().trim() || null;

      const finalPhone = (
        pendingClaim?.customerPhone ||
        customerPhone ||
        metadata.customer_phone
      )?.trim() || null;

      const companyName =
        pendingClaim?.companyName ||
        metadata.company_name ||
        customerName ||
        "New Startup";

      const url = pendingClaim?.url || metadata.url || "https://getopfloor.com";
      const category = pendingClaim?.category || metadata.category || "Startup";
      const price = pendingClaim?.amount || Number(metadata.price) || 50;

      // If already claimed, return immediate confirmation
      if (pendingClaim && pendingClaim.status === "succeeded") {
        await releaseFloorLock(targetRankToRelease, paymentId, checkoutSessionId);
        return NextResponse.json({
          status: "succeeded",
          rank: 1,
          companyName: pendingClaim.companyName,
          customerEmail: finalEmail,
        });
      }

      // Claim top floor atomically
      const result = await claimTopFloorTransactional({
        paymentId: paymentId || targetId,
        checkoutSessionId: checkoutSessionId || undefined,
        companyName,
        url,
        category,
        price,
        customerEmail: finalEmail || undefined,
        customerPhone: finalPhone || undefined,
      });

      await releaseFloorLock(targetRankToRelease, paymentId, checkoutSessionId);

      return NextResponse.json({
        status: "succeeded",
        rank: result.rank,
        companyName: result.companyName || companyName,
        url: result.url || url,
        logoUrl: result.logoUrl,
        tagline: result.tagline,
        description: result.description,
        customerEmail: finalEmail,
      });
    }

    return NextResponse.json({
      status: paymentStatus || "pending",
      message: "Payment is being processed.",
    });
  } catch (err: any) {
    console.error("Error verifying payment:", err);
    return NextResponse.json(
      { error: "Failed to verify payment status." },
      { status: 500 }
    );
  }
}
