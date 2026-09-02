import { NextRequest, NextResponse } from "next/server";
import { getAdminCredentials, createAdminToken } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const { email: adminEmail, password: adminPassword } = getAdminCredentials();

    const cleanInputEmail = email.toLowerCase().trim();
    const isEmailMatch = cleanInputEmail === adminEmail;
    const isPassMatch = password === adminPassword;

    if (!isEmailMatch || !isPassMatch) {
      return NextResponse.json(
        { error: "Invalid admin email or password" },
        { status: 401 }
      );
    }

    const token = createAdminToken(adminEmail);

    const res = NextResponse.json({
      success: true,
      email: adminEmail,
      token,
    });

    // Set secure HTTP-only cookie
    res.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return res;
  } catch (err: any) {
    console.error("Admin login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
