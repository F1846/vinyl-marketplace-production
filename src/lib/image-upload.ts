"use server";

import { put } from "@vercel/blob";
import { nanoid } from "nanoid";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export async function uploadProductImage(
  file: File
): Promise<{ url: string; error?: string }> {
  // Validate against an explicit allowlist rather than a broad prefix check.
  // This prevents spoofed MIME types like "image/svg+xml" (XSS risk) from slipping through.
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { url: "", error: "File must be a JPEG, PNG, WebP, GIF, or AVIF image" };
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { url: "", error: "File must be under 5MB" };
  }

  // Derive the extension from the validated MIME type, not the untrusted filename.
  const extension = MIME_TO_EXTENSION[file.type] ?? "jpg";
  const filename = `products/${nanoid(16)}.${extension}`;

  try {
    const blob = await put(filename, file, {
      access: "public",
    });
    return { url: blob.url };
  } catch (err) {
    console.error("Image upload failed:", err);
    return { url: "", error: "Failed to upload image" };
  }
}

export async function deleteProductImage(url: string): Promise<void> {
  try {
    const { del } = await import("@vercel/blob");
    await del(url);
  } catch (err) {
    console.error("Image deletion failed:", err);
  }
}
