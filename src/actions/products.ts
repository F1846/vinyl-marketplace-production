"use server";

import { db } from "@/db";
import { schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { MediaCondition } from "@/types/product";

const MEDIA_CONDITIONS = new Set<MediaCondition>(["M", "NM", "VG+", "VG", "G", "P"]);

function parseMediaCondition(value: string | File | null): MediaCondition | null {
  if (typeof value !== "string" || !MEDIA_CONDITIONS.has(value as MediaCondition)) {
    return null;
  }
  return value as MediaCondition;
}

// ─── Add Product (Server Action from FormData) ───

export async function addProductFormAction(
  prevState: { error: string | null; success: boolean },
  formData: FormData
): Promise<{ error: string | null; success: boolean }> {
  const d = db();

  const imageUrlsRaw = (formData.get("imageUrls") as string) ?? "";
  const imageUrls = imageUrlsRaw
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean);

  // Validate at least one image or allow placeholder
  const priceCents = Number(formData.get("priceCents"));
  const stockQuantity = Number(formData.get("stockQuantity"));
  const pressingYear = formData.get("pressingYear") ? Number(formData.get("pressingYear")) : null;

  if (priceCents < 0) return { error: "Price must be 0 or more", success: false };
  if (stockQuantity < 0) return { error: "Stock must be 0 or more", success: false };
  if (pressingYear && (pressingYear < 1900 || pressingYear > 2030)) return { error: "Invalid pressing year", success: false };

  const productId = crypto.randomUUID();

  const artist = String(formData.get("artist"));
  const title = String(formData.get("title"));
  const format = formData.get("format") as "vinyl" | "cassette" | "cd";
  const genre = String(formData.get("genre"));
  const conditionMedia = parseMediaCondition(formData.get("conditionMedia"));
  const conditionSleeve = format === "vinyl" ? parseMediaCondition(formData.get("conditionSleeve")) : null;
  const pressingLabel = (formData.get("pressingLabel") as string) || null;
  const pressingCatalogNumber = (formData.get("pressingCatalogNumber") as string) || null;
  const description = String(formData.get("description"));

  try {
    await d.insert(schema.products).values({
      id: productId,
      artist,
      title,
      format,
      genre,
      priceCents,
      stockQuantity,
      conditionMedia,
      conditionSleeve,
      pressingLabel,
      pressingYear,
      pressingCatalogNumber,
      description,
      status: "active" as const,
      version: 1,
    });

    for (let i = 0; i < imageUrls.length; i++) {
      await d.insert(schema.productImages).values({
        id: crypto.randomUUID(),
        productId,
        url: imageUrls[i],
        sortOrder: i,
      });
    }

    revalidatePath("/catalog");
    revalidatePath("/admin/products");
    return { error: null, success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "Failed to create product",
      success: false,
    };
  }
}

// ─── Update Product ───

export async function updateProduct(id: string, formData: FormData) {
  "use server";
  const d = db();

  const product = await d.query.products.findFirst({
    where: eq(schema.products.id, id),
  });

  if (!product) return { error: "Product not found" };

  const priceCents = Number(formData.get("priceCents"));
  const stockQuantity = Number(formData.get("stockQuantity"));
  const pressingYear = formData.get("pressingYear") ? Number(formData.get("pressingYear")) : null;
  const updateFormat = formData.get("format") as "vinyl" | "cassette" | "cd";
  const updateConditionSleeve = updateFormat === "vinyl" ? parseMediaCondition(formData.get("conditionSleeve")) : null;

  await d
    .update(schema.products)
    .set({
      artist: String(formData.get("artist")),
      title: String(formData.get("title")),
      format: updateFormat,
      genre: String(formData.get("genre")),
      priceCents,
      stockQuantity,
      conditionMedia: parseMediaCondition(formData.get("conditionMedia")),
      conditionSleeve: updateConditionSleeve,
      pressingLabel: (formData.get("pressingLabel") as string) || null,
      pressingYear,
      pressingCatalogNumber: (formData.get("pressingCatalogNumber") as string) || null,
      description: String(formData.get("description")),
      version: product.version + 1,
    })
    .where(eq(schema.products.id, id));

  revalidatePath("/catalog");
  revalidatePath("/admin/products");
  revalidatePath(`/products/${id}`);
  return { success: true };
}

// ─── Archive Product ───

export async function archiveProduct(id: string) {
  "use server";
  const d = db();

  await d
    .update(schema.products)
    .set({ status: "sold_out" })
    .where(eq(schema.products.id, id));

  revalidatePath("/catalog");
  revalidatePath("/admin/products");
}

// ─── Restore Product (from sold_out to active) ───

export async function restoreProduct(id: string) {
  "use server";
  const d = db();

  await d
    .update(schema.products)
    .set({ status: "active" })
    .where(eq(schema.products.id, id));

  revalidatePath("/catalog");
  revalidatePath("/admin/products");
}
