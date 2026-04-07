"use server";

import { put } from "@vercel/blob";
import { nanoid } from "nanoid";

export async function uploadProductImage(
  file: File
): Promise<{ url: string; error?: string }> {
  // Validate file type
  if (!file.type.startsWith("image/")) {
    return { url: "", error: "File must be an image" };
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { url: "", error: "File must be under 5MB" };
  }

  const extension = file.name.split(".").pop() || "jpg";
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
