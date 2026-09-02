import { NextRequest, NextResponse } from "next/server";
import { claimTopFloorTransactional } from "@/lib/db/floors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get("payment_id") || `mock_${Date.now()}`;
  const url = searchParams.get("url") || "https://example.com";
  const category = searchParams.get("category") || "Developer Tools";
  const companyName = searchParams.get("company_name") || "Mock Startup";
  const price = Math.max(50, Number(searchParams.get("price")) || 50);
  const returnUrl = searchParams.get("return_url") || "/";

  try {
    console.log(`Executing test mock payment for ${companyName} at ₹${price}...`);
    const result = await claimTopFloorTransactional({
      paymentId,
      companyName,
      url,
      category,
      price,
    });

    const target = new URL(returnUrl, req.url);
    target.searchParams.set("claimed", "true");
    target.searchParams.set("company", companyName);
    target.searchParams.set("rank", "1");
    target.searchParams.set("manage_token", result.manageToken);

    return NextResponse.redirect(target);
  } catch (err: any) {
    console.error("Failed to process mock payment claim:", err);
    return NextResponse.json(
      { error: err?.message || "Mock payment failed" },
      { status: 500 }
    );
  }
}
