import { NextRequest, NextResponse } from "next/server";
import { uploadToBlob } from "@/lib/storage/blob";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    const ALLOWED_MIME_TYPES = new Set([
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/svg+xml",
      "image/x-icon",
      "image/vnd.microsoft.icon",
      "image/gif",
    ]);

    if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: "File must be a supported image format (PNG, JPG, SVG, WebP, ICO, GIF)." },
        { status: 400 }
      );
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
