import { NextRequest, NextResponse } from "next/server";
import { verifyDodoWebhookSignature } from "@/lib/dodo";
import { FloorsService } from "@/actions/floors/floors.service";
import { verifyWebsiteLive } from "@/lib/validation/domain-server";
import { db } from "@/lib/db/config/client";
import { claims } from "@/lib/db/config/schema";
import { eq, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "Dodo Payments webhook listener is active",
    timestamp: new Date().toISOString(),
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, webhook-signature, dodo-signature, x-dodo-signature",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const headers = {
      "webhook-id": req.headers.get("webhook-id"),
      "webhook-timestamp": req.headers.get("webhook-timestamp"),
      "webhook-signature":
        req.headers.get("webhook-signature") ||
        req.headers.get("dodo-signature") ||
        req.headers.get("x-dodo-signature"),
    };

    // Verify webhook signature (Standard Webhooks with HMAC fallback)
    const isValid = verifyDodoWebhookSignature(rawBody, headers);
    if (!isValid) {
      console.warn("Invalid Dodo webhook signature rejected");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.type || payload.event;

    // Process payment.succeeded or checkout.completed event
    if (
      eventType === "payment.succeeded" ||
      eventType === "checkout.completed" ||
      eventType === "payment_succeeded"
    ) {
      const data = payload.data || payload;
      const metadata = data.metadata || {};
      const paymentId = data.payment_id || data.id || payload.id;
      const checkoutSessionId =
        data.checkout_session_id || data.checkout_id || payload.checkout_session_id || paymentId;

      const companyUrl = metadata.company_url || metadata.url || "https://getopfloor.com";
      const companyName = metadata.company_name;
      const category = metadata.category;

      // SECURITY: Always calculate price from the authoritative gateway charge amount (in paise / subunits).
      // Never trust client-supplied or mutable metadata.price over the actual amount charged!
      const rawGatewayAmount = data.total_amount ?? data.amount;
      const actualPaidInr =
        rawGatewayAmount != null && !isNaN(Number(rawGatewayAmount))
          ? Math.floor(Number(rawGatewayAmount) / 100)
          : null;

      if (actualPaidInr == null || actualPaidInr < 50) {
        console.error(
          `Rejecting webhook for ${companyUrl}: invalid or sub-minimum charge amount (raw: ${rawGatewayAmount}, inr: ${actualPaidInr})`
        );
        return NextResponse.json(
          { error: "Payment amount does not meet minimum threshold" },
          { status: 400 }
        );
      }

      // If metadata specifies an expected price, verify the customer actually paid at least that amount
      const expectedPrice = Number(metadata.price);
      if (!isNaN(expectedPrice) && expectedPrice > 0 && actualPaidInr < expectedPrice) {
        console.error(
          `Rejecting webhook for ${companyUrl}: paid ₹${actualPaidInr} but metadata claimed ₹${expectedPrice} (underpayment/metadata manipulation)`
        );
        return NextResponse.json(
          { error: "Paid amount does not match expected metadata price" },
          { status: 400 }
        );
      }

      const price = actualPaidInr;
      const customerEmail = data.customer?.email || metadata.customer_email;
      const customerPhone =
        data.customer?.phone_number || data.customer_phone || data.billing?.phone;

      const verification = await verifyWebsiteLive(companyUrl);
      if (!verification.valid || !verification.cleanUrl) {
        console.error(
          `Rejecting webhook for ${companyUrl}: unreachable or invalid domain (${verification.error})`
        );
        return NextResponse.json(
          { error: verification.error || "Invalid or unreachable website URL" },
          { status: 400 }
        );
      }
      const cleanCompanyUrl = verification.cleanUrl;

      console.log(`Processing verified webhook payment for ${cleanCompanyUrl} (${paymentId}) at ₹${price}...`);

      const result = await FloorsService.claimTopFloor({
        paymentId,
        checkoutSessionId,
        companyName,
        companyUrl: cleanCompanyUrl,
        category,
        price,
        customerEmail,
        customerPhone,
      });

      console.log("Webhook transaction result:", result);
      if (!result.success) {
        console.error(`Webhook floor claim failed for ${cleanCompanyUrl}:`, result.error);
        return NextResponse.json(
          { error: result.error || "Failed to claim top floor" },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: result.success, rank: result.rank });
    }

    // Process payment.failed or checkout.expired / cancelled events
    if (
      eventType === "payment.failed" ||
      eventType === "payment_failed" ||
      eventType === "checkout.expired" ||
      eventType === "checkout.cancelled"
    ) {
      console.log(`Payment failed/expired webhook event (${eventType})`);
      const data = payload.data || payload;
      const paymentId = data.payment_id || data.id || payload.id;
      const checkoutSessionId =
        data.checkout_session_id || data.checkout_id || payload.checkout_session_id || paymentId;

      if (checkoutSessionId || paymentId) {
        try {
          await db
            .update(claims)
            .set({ status: "failed", updatedAt: new Date() })
            .where(
              or(
                ...(checkoutSessionId ? [eq(claims.checkoutSessionId, checkoutSessionId)] : []),
                ...(paymentId ? [eq(claims.paymentId, paymentId)] : [])
              )
            );
        } catch (dbErr) {
          console.warn("Could not mark claim failed in DB:", dbErr);
        }
      }

      return NextResponse.json({ success: true, message: "Handled failure/expiry" });
    }

    return NextResponse.json({ received: true, eventType });
  } catch (err: any) {
    console.error("Error processing Dodo Payments webhook:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
