import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { uploadToBlob } from "@/lib/storage/blob";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image (PNG, JPG, SVG, WebP, ICO)." }, { status: 400 });
    }

    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 4MB limit." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const url = await uploadToBlob(arrayBuffer, file.name, file.type);

    if (!url) {
      return NextResponse.json(
        { error: "Vercel Blob Storage is not configured. Please ensure BLOB_READ_WRITE_TOKEN is set in Vercel." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to upload image." }, { status: 500 });
  }
}
