import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { db } from "@/lib/db/config/client";
import { floors } from "@/lib/db/config/schema";
import { desc, asc } from "drizzle-orm";

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

    const allClaimedFloors = await db
      .select()
      .from(floors)
      .orderBy(desc(floors.pricePaid), asc(floors.claimedAt));

    const userMap = new Map<string, any>();
    for (let i = 0; i < allClaimedFloors.length; i++) {
      const f = allClaimedFloors[i];
      const key = f.userEmail || f.companyUrl || `floor-${f.id}`;
      if (!userMap.has(key)) {
        userMap.set(key, {
          id: f.id,
          email: f.userEmail || "anonymous",
          name: f.companyName,
          phone: null,
          createdAt: f.claimedAt ? new Date(f.claimedAt).toISOString() : new Date().toISOString(),
          productCount: 0,
          products: [],
        });
      }
      const entry = userMap.get(key);
      entry.productCount += 1;
      entry.products.push({
        id: f.id,
        rank: i + 1,
        companyName: f.companyName,
        companyUrl: f.companyUrl,
        category: f.category,
        pricePaid: f.pricePaid,
        claimedAt: f.claimedAt ? new Date(f.claimedAt).toISOString() : null,
      });
    }
    const users = Array.from(userMap.values());

    const claimedCount = allClaimedFloors.length;
    const revenue = allClaimedFloors.reduce((sum, f) => sum + (f.pricePaid || 0), 0);

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
