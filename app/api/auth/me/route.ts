import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getFloorsByEmail } from "@/lib/db/floors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = getAuthenticatedUser(req);
    if (!session) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        ownedFloors: [],
      });
    }

    const ownedFloors = await getFloorsByEmail(session.email);

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.id,
        email: session.email,
        name: session.name,
        avatarUrl: session.avatarUrl,
      },
      ownedFloors,
    });
  } catch (err: any) {
    console.error("Error fetching me profile:", err);
    return NextResponse.json({
      authenticated: false,
      user: null,
      ownedFloors: [],
    });
  }
}
