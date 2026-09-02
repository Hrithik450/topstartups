import { NextRequest, NextResponse } from "next/server";
import { verifyDodoWebhookSignature } from "@/lib/dodo";
import { claimTopFloorTransactional } from "@/lib/db/floors";

export const dynamic = "force-dynamic";

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

      const companyName =
        metadata.company_name || data.customer?.name || "Anonymous Startup";
      const url = metadata.url || "https://bharathunt.com";
      const category = metadata.category || "Startup";
      const price = Number(metadata.price) || Math.round(Number(data.total_amount || data.amount || 4600) / 100);
      const customerEmail = data.customer?.email || metadata.customer_email;

      console.log(`Processing verified payment success for ${companyName} (${paymentId})...`);

      const result = await claimTopFloorTransactional({
        paymentId,
        companyName,
        url,
        category,
        price,
        customerEmail,
      });

      console.log("Transaction result:", result);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ received: true, eventType });
  } catch (err: any) {
    console.error("Error processing Dodo Payments webhook:", err);
    return NextResponse.json(
      { error: err?.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}
