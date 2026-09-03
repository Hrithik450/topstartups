import { NextRequest, NextResponse } from "next/server";
import { claimTopFloorTransactional } from "@/lib/db/floors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // SECURITY: Block this endpoint entirely in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get("payment_id") || "mock_single_session";
  const url = searchParams.get("url") || "https://example.com";
  const category = searchParams.get("category") || "Developer Tools";
  const companyName = searchParams.get("company_name") || "Mock Startup";
  const price = Math.max(50, Number(searchParams.get("price")) || 50);

  try {
    console.log(`Executing test mock payment for ${companyName} at ₹${price}...`);
    const result = await claimTopFloorTransactional({
      paymentId,
      companyName,
      url,
      category,
      price,
    });

    // SECURITY: Only redirect to same-origin to prevent open redirect attacks.
    // Never include manage_token in URL query params (leaks via Referer, logs).
    const origin = new URL(req.url).origin;
    const target = new URL("/", origin);
    target.searchParams.set("claimed", "true");
    target.searchParams.set("company", companyName);
    target.searchParams.set("rank", "1");
    // manage_token is returned only in the JSON body for dev tooling, never in redirects
    console.log(`[DEV] Manage token for ${companyName}: ${result.manageToken}`);

    return NextResponse.redirect(target);
  } catch (err: any) {
    console.error("Failed to process mock payment claim:", err);
    return NextResponse.json(
      { error: "Mock payment failed" },
      { status: 500 }
    );
  }
}
