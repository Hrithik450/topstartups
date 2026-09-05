import { NextRequest, NextResponse } from "next/server";
import { verifyDodoWebhookSignature } from "@/lib/dodo";
import { FloorsService } from "@/actions/floors/floors.service";
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
      const price =
        Number(metadata.price) ||
        Math.round(Number(data.total_amount || data.amount || 5000) / 100);
      const customerEmail = data.customer?.email || metadata.customer_email;
      const customerPhone =
        data.customer?.phone_number || data.customer_phone || data.billing?.phone;

      console.log(`Processing verified webhook payment for ${companyUrl} (${paymentId})...`);

      const result = await FloorsService.claimTopFloor({
        paymentId,
        checkoutSessionId,
        companyName,
        companyUrl,
        category,
        price,
        customerEmail,
        customerPhone,
      });

      console.log("Webhook transaction result:", result);
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
