import { NextRequest, NextResponse } from "next/server";
import { FloorsService } from "@/actions/floors/floors.service";
import { validateWebsiteSyntax } from "@/lib/validation/domain";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // SECURITY: Block this endpoint entirely in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get("payment_id") || "mock_single_session";
  const url = searchParams.get("company_url") || searchParams.get("url") || "https://example.com";
  const category = searchParams.get("category") || "Developer Tools";
  const companyName = searchParams.get("company_name") || "Mock Startup";
  const price = Math.max(50, Number(searchParams.get("price")) || 50);

  // Fast domain syntax validation
  const syntaxCheck = validateWebsiteSyntax(url);
  if (!syntaxCheck.valid || !syntaxCheck.cleanUrl) {
    return NextResponse.json(
      { error: syntaxCheck.error || "Invalid website URL format." },
      { status: 400 }
    );
  }

  try {
    console.log(`Executing test mock payment for ${syntaxCheck.cleanUrl} at ₹${price}...`);
    const result = await FloorsService.claimTopFloor({
      checkoutSessionId: paymentId,
      paymentId,
      companyName,
      companyUrl: syntaxCheck.cleanUrl,
      category,
      price,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Mock payment failed" },
        { status: 500 }
      );
    }

    // SECURITY: Only redirect to same-origin to prevent open redirect attacks.
    const origin = new URL(req.url).origin;
    const target = new URL("/", origin);
    target.searchParams.set("payment_id", paymentId);
    target.searchParams.set("status", "succeeded");
    console.log(`[DEV] Mock claim succeeded for ${syntaxCheck.cleanUrl}`);

    return NextResponse.redirect(target);
  } catch (err: any) {
    console.error("Failed to process mock payment claim:", err);
    return NextResponse.json(
      { error: "Mock payment failed" },
      { status: 500 }
    );
  }
}
