import { NextRequest, NextResponse } from "next/server";
import { verifyFounderEmail } from "@/lib/validation/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { valid: false, error: "Founder email address is required." },
        { status: 400 }
      );
    }

    const verification = await verifyFounderEmail(email);
    if (!verification.valid || !verification.email) {
      return NextResponse.json(
        {
          valid: false,
          error:
            verification.error ||
            "Please provide a valid, deliverable email address (e.g. founder@yourcompany.com).",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: verification.email,
      domain: verification.domain,
    });
  } catch (err: any) {
    console.error("Error during email verification API:", err);
    return NextResponse.json(
      { valid: false, error: "Unable to verify email deliverability. Please check the email and try again." },
      { status: 500 }
    );
  }
}
