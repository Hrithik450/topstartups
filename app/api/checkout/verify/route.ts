import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { claims } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { claimTopFloorTransactional } from "@/lib/db/floors";

export const dynamic = "force-dynamic";

const DODO_ENV = process.env.DODO_PAYMENTS_ENVIRONMENT || "test";
const DODO_API_URL =
  DODO_ENV === "live"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id") || searchParams.get("checkout_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "session_id parameter is required" },
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

    // 1. Fetch checkout status from Dodo Payments
    const dodoRes = await fetch(`${DODO_API_URL}/checkouts/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!dodoRes.ok) {
      console.warn("Could not query Dodo checkout session:", dodoRes.status);
      return NextResponse.json(
        { status: "unknown", message: "Could not verify payment session with gateway." },
        { status: 200 }
      );
    }

    const sessionData = await dodoRes.json();
    const paymentStatus = sessionData.payment_status; // "succeeded", "failed", "pending", etc.

    // 2. Look up claim in our database
    const existingClaims = await db
      .select()
      .from(claims)
      .where(eq(claims.paymentId, sessionId))
      .limit(1);

    const pendingClaim = existingClaims[0];

    if (paymentStatus === "failed") {
      if (pendingClaim && pendingClaim.status === "pending") {
        await db
          .update(claims)
          .set({ status: "failed" })
          .where(eq(claims.id, pendingClaim.id));
      }
      return NextResponse.json({
        status: "failed",
        error: "Payment was not successful. Please choose another payment method (such as UPI for INR transactions).",
      });
    }

    if (paymentStatus === "succeeded") {
      const customerEmail = (pendingClaim?.customerEmail || sessionData.customer_email || sessionData.customer?.email)?.toLowerCase().trim() || null;
      const customerPhone = (pendingClaim?.customerPhone || sessionData.customer?.phone_number || sessionData.customer_phone || sessionData.billing?.phone)?.trim() || null;
      const companyName = pendingClaim?.companyName || sessionData.customer_name || sessionData.customer?.name || "New Startup";
      const url = pendingClaim?.url || "https://getopfloor.com";
      const category = pendingClaim?.category || "Startup";
      const price = pendingClaim?.amount || 50;

      // If already claimed, return confirmation
      if (pendingClaim && pendingClaim.status === "succeeded") {
        return NextResponse.json({
          status: "succeeded",
          rank: 1,
          companyName: pendingClaim.companyName,
          customerEmail,
        });
      }

      // Claim top floor atomically
      const result = await claimTopFloorTransactional({
        paymentId: sessionId,
        companyName,
        url,
        category,
        price,
        customerEmail: customerEmail || undefined,
        customerPhone: customerPhone || undefined,
      });

      return NextResponse.json({
        status: "succeeded",
        rank: result.rank,
        companyName,
        customerEmail,
      });
    }

    return NextResponse.json({
      status: paymentStatus || "pending",
      message: "Payment is being processed.",
    });
  } catch (err) {
    console.error("Error verifying payment:", err);
    return NextResponse.json(
      { error: "Failed to verify payment status." },
      { status: 500 }
    );
  }
}
