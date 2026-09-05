import { NextRequest, NextResponse } from "next/server";
import { verifyWebsiteLive } from "@/lib/validation/domain-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { valid: false, error: "Please enter your startup website URL." },
        { status: 400 }
      );
    }

    const verification = await verifyWebsiteLive(url);
    if (!verification.valid || !verification.cleanUrl) {
      return NextResponse.json(
        {
          valid: false,
          error: verification.error || "Website could not be reached or is not secure.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      cleanUrl: verification.cleanUrl,
      domain: verification.domain,
    });
  } catch (err: any) {
    console.error("Error during website live verification API:", err);
    return NextResponse.json(
      { valid: false, error: "Unable to verify website. Please check the URL and try again." },
      { status: 500 }
    );
  }
}
