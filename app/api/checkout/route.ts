import { NextRequest, NextResponse } from "next/server";
import { createDodoCheckout } from "@/lib/dodo";
import { db } from "@/lib/db/client";
import { claims } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, category, companyName, price, customerEmail } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Website URL is required" }, { status: 400 });
    }

    const cleanUrl = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
    const name = companyName?.trim() || cleanUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const amount = Number(price) > 0 ? Number(price) : 46;

    // Determine return origin
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    const origin = `${protocol}://${host}`;

    // Create Dodo Payments checkout session
    const checkout = await createDodoCheckout({
      url: cleanUrl,
      category: category || "Startup",
      companyName: name,
      price: amount,
      customerEmail: customerEmail?.trim(),
      returnUrl: origin,
    });

    // Record pending claim in database
    try {
      await db.insert(claims).values({
        paymentId: checkout.paymentId,
        status: "pending",
        companyName: name,
        url: cleanUrl,
        category: category || "Startup",
        amount,
        currency: "INR",
        customerEmail: customerEmail?.trim() || null,
        checkoutUrl: checkout.checkoutUrl,
      });
    } catch (dbErr) {
      console.warn("Could not record pending claim to database immediately:", dbErr);
    }

    return NextResponse.json({
      success: true,
      paymentId: checkout.paymentId,
      checkoutUrl: checkout.checkoutUrl,
      isMock: checkout.isMock ?? false,
    });
  } catch (err: any) {
    console.error("Error initiating checkout:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
