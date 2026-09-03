import { NextRequest, NextResponse } from "next/server";
import { verifyDodoWebhookSignature } from "@/lib/dodo";
import { claimTopFloorTransactional } from "@/lib/db/floors";
import { releaseFloorLock } from "@/lib/db/locks";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ status: "Dodo Payments webhook listener is active", timestamp: new Date().toISOString() });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, webhook-signature, dodo-signature, x-dodo-signature",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("webhook-signature") ||
      req.headers.get("dodo-signature") ||
      req.headers.get("x-dodo-signature");

    // Verify webhook signature
    const isValid = verifyDodoWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn("Invalid Dodo webhook signature rejected");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.type || payload.event;

    // Process payment.succeeded or checkout.completed event
    if (eventType === "payment.succeeded" || eventType === "checkout.completed" || eventType === "payment_succeeded") {
      const data = payload.data || payload;
      const metadata = data.metadata || {};
      const paymentId = data.payment_id || data.id || payload.id;
      const checkoutSessionId = data.checkout_session_id || data.checkout_id || payload.checkout_session_id;

      const companyName =
        metadata.company_name || data.customer?.name || "Anonymous Startup";
      const url = metadata.url || "https://getopfloor.com";
      const category = metadata.category || "Startup";
      const price = Number(metadata.price) || Math.round(Number(data.total_amount || data.amount || 5000) / 100);
      const customerEmail = data.customer?.email || metadata.customer_email;
      const customerPhone = data.customer?.phone_number || data.customer_phone || data.billing?.phone;

      console.log(`Processing verified webhook payment for ${companyName} (${paymentId})...`);

      const result = await claimTopFloorTransactional({
        paymentId,
        checkoutSessionId,
        companyName,
        url,
        category,
        price,
        customerEmail,
        customerPhone,
      });

      await releaseFloorLock(1);

      console.log("Webhook transaction result:", result);
      return NextResponse.json({ success: true, rank: result.rank });
    }

    // Process payment.failed or checkout.expired / cancelled events
    if (
      eventType === "payment.failed" ||
      eventType === "payment_failed" ||
      eventType === "checkout.expired" ||
      eventType === "checkout.cancelled"
    ) {
      const data = payload.data || payload;
      const paymentId = data.payment_id || data.id || payload.id;
      const checkoutSessionId = data.checkout_session_id || data.checkout_id || payload.checkout_session_id;

      await releaseFloorLock(1, paymentId, checkoutSessionId);
      console.log(`Released floor lock on failed/expired webhook event (${eventType}):`, paymentId || checkoutSessionId);

      return NextResponse.json({ success: true, message: "Lock released on failure/expiry" });
    }

    return NextResponse.json({ received: true, eventType });
  } catch (err: any) {
    console.error("Error processing Dodo Payments webhook:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
