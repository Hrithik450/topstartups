import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { getAllUsersWithProducts } from "@/lib/db/users";
import { db } from "@/lib/db/config/client";
import { floors } from "@/lib/db/config/schema";
import { count, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Check cookie or Bearer token
    const cookieToken = req.cookies.get("admin_session")?.value;
    const authHeader = req.headers.get("Authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const token = cookieToken || bearerToken;

    if (!verifyAdminToken(token)) {
      return NextResponse.json({ error: "Unauthorized admin access" }, { status: 401 });
    }

    const users = await getAllUsersWithProducts();

    // Calculate high-level stats using pure Drizzle
    const totalClaimedFloors = await db
      .select({ count: count() })
      .from(floors)
      .where(eq(floors.isClaimed, true));

    const claimedCount = Number(totalClaimedFloors[0]?.count || 0);

    // Sum revenue from claimed floors
    const allClaimed = await db
      .select({ pricePaid: floors.pricePaid })
      .from(floors)
      .where(eq(floors.isClaimed, true));

    const revenue = allClaimed.reduce((sum, f) => sum + (f.pricePaid || 0), 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: users.length,
        totalClaimedFloors: claimedCount,
        availableFloors: Math.max(0, 50 - claimedCount),
        totalRevenue: revenue,
      },
      users,
    });
  } catch (err: any) {
    console.error("Error fetching admin users:", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
