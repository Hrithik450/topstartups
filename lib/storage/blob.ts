import { put } from "@vercel/blob";

/**
 * Checks if Vercel Blob Storage environment is active.
 */
function isBlobConfigured(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.BLOB_STORE_ID ||
    process.env.BLOB_WEBHOOK_PUBLIC_KEY ||
    process.env.VERCEL
  );
}

/**
 * Upload a local file/buffer directly to Vercel Blob Storage.
 * Returns the permanent public CDN URL.
 */
export async function uploadToBlob(
  fileOrBuffer: Buffer | Blob | File | ArrayBuffer,
  filename: string,
  contentType?: string
): Promise<string | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim() || undefined;
  if (!token && !isBlobConfigured()) {
    console.warn("Vercel Blob Storage is not configured. Skipping Vercel Blob upload.");
    return null;
  }

  try {
    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `logos/${Date.now()}-${cleanFilename}`;
    const blob = await put(path, fileOrBuffer, {
      access: "public",
      token,
      contentType,
    });
    return blob.url;
  } catch (err) {
    console.error("Failed to upload to Vercel Blob:", err);
    return null;
  }
}

/**
 * Fetch an external logo/favicon URL and persist it to Vercel Blob Storage.
 * Prevents hotlink blocking, broken external images, and CORS issues in Three.js WebGL.
 * Falls back to the original URL if Vercel Blob is not configured.
 */
/**
 * Validates whether a URL strictly belongs to Vercel Blob Storage hostname.
 * Prevents URL substring bypass vulnerabilities (CodeQL js/incomplete-url-substring-sanitization).
 */
function isVercelBlobUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== "string") return false;
  try {
    const parsed = new URL(urlStr);
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname === "vercel-storage.com" ||
        parsed.hostname.endsWith(".vercel-storage.com") ||
        parsed.hostname.endsWith(".blob.vercel-storage.com"))
    );
  } catch {
    return false;
  }
}

/**
 * Fetch an external logo/favicon URL and persist it to Vercel Blob Storage.
 * Prevents hotlink blocking, broken external images, and CORS issues in Three.js WebGL.
 * Falls back to the original URL if Vercel Blob is not configured.
 */
export async function persistImageToBlob(
  externalUrl: string,
  prefixName: string
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim() || undefined;
  if ((!token && !isBlobConfigured()) || !externalUrl || isVercelBlobUrl(externalUrl)) {
    return externalUrl;
  }

  try {
    const res = await fetch(externalUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 GeTopFloorBot/1.0",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return externalUrl;
    }

    const contentType = res.headers.get("content-type") || "image/png";
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > 5 * 1024 * 1024) {
      return externalUrl;
    }

    let ext = "png";
    if (contentType.includes("svg")) ext = "svg";
    else if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = "jpg";
    else if (contentType.includes("webp")) ext = "webp";
    else if (contentType.includes("ico") || contentType.includes("x-icon")) ext = "ico";

    const cleanPrefix = prefixName.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
    const filename = `${cleanPrefix}_logo.${ext}`;

    const blobUrl = await uploadToBlob(arrayBuffer, filename, contentType);
    return blobUrl || externalUrl;
  } catch (err) {
    console.warn(`Failed to persist external image (${externalUrl}) to Vercel Blob:`, err);
    return externalUrl;
  }
}
