"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { revalidatePath } from "next/cache";
import { requireAuthenticatedAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  archiveProductRecord,
  deleteProductRecord,
  relistProductRecord,
} from "@/lib/product-admin";
import type { MediaCondition, ProductStatus } from "@/types/product";

const MEDIA_CONDITIONS = new Set<MediaCondition>(["M", "NM", "VG+", "VG", "G", "P"]);

function parseMediaCondition(value: string | File | null): MediaCondition | null {
  if (typeof value !== "string" || !MEDIA_CONDITIONS.has(value as MediaCondition)) {
    return null;
  }
  return value as MediaCondition;
}

function statusFromStock(stockQuantity: number): ProductStatus {
  return stockQuantity > 0 ? "active" : "sold_out";
}

function revalidateProductPaths(productId?: string) {
  revalidatePath("/");
  revalidatePath("/catalog");
  revalidatePath("/admin");
  revalidatePath("/admin/products");

  if (productId) {
    revalidatePath(`/products/${productId}`);
  }
}

export async function addProductFormAction(
  _prevState: { error: string | null; success: boolean },
  formData: FormData
): Promise<{ error: string | null; success: boolean }> {
  await requireAuthenticatedAdmin();

  const d = db();
  const imageUrlsRaw = (formData.get("imageUrls") as string) ?? "";
  const imageUrls = imageUrlsRaw
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean);

  const priceCents = Number(formData.get("priceCents"));
  const stockQuantity = Number(formData.get("stockQuantity"));
  const pressingYear = formData.get("pressingYear") ? Number(formData.get("pressingYear")) : null;

  if (priceCents < 0) return { error: "Price must be 0 or more", success: false };
  if (stockQuantity < 0) return { error: "Stock must be 0 or more", success: false };
  if (!Number.isInteger(priceCents) || !Number.isInteger(stockQuantity)) {
    return { error: "Price and stock must be whole numbers", success: false };
  }
  if (pressingYear && (pressingYear < 1900 || pressingYear > 2030)) {
    return { error: "Invalid pressing year", success: false };
  }
  if (imageUrls.length > 10) {
    return { error: "Use at most 10 images per product", success: false };
  }

  const productId = crypto.randomUUID();
  const artist = String(formData.get("artist"));
  const title = String(formData.get("title"));
  const format = formData.get("format") as "vinyl" | "cassette" | "cd";
  const genre = String(formData.get("genre"));
  const conditionMedia = parseMediaCondition(formData.get("conditionMedia"));
  const conditionSleeve =
    format === "vinyl" ? parseMediaCondition(formData.get("conditionSleeve")) : null;
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
      status: statusFromStock(stockQuantity),
      version: 1,
    });

    if (imageUrls.length > 0) {
      await d.insert(schema.productImages).values(
        imageUrls.map((url, sortOrder) => ({
          id: crypto.randomUUID(),
          productId,
          url,
          sortOrder,
        }))
      );
    }

    revalidateProductPaths(productId);
    return { error: null, success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "Failed to create product",
      success: false,
    };
  }
}

export async function updateProduct(id: string, formData: FormData): Promise<void> {
  "use server";
  await requireAuthenticatedAdmin();

  const d = db();
  const product = await d.query.products.findFirst({
    where: and(eq(schema.products.id, id), isNull(schema.products.deletedAt)),
  });

  if (!product) {
    redirect("/admin/products");
  }

  const priceCents = Number(formData.get("priceCents"));
  const stockQuantity = Number(formData.get("stockQuantity"));
  const pressingYear = formData.get("pressingYear") ? Number(formData.get("pressingYear")) : null;
  const updateFormat = formData.get("format") as "vinyl" | "cassette" | "cd";
  const updateConditionSleeve =
    updateFormat === "vinyl" ? parseMediaCondition(formData.get("conditionSleeve")) : null;
  const nextStatus =
    product.status === "archived" ? "archived" : statusFromStock(stockQuantity);

  if (priceCents < 0 || stockQuantity < 0) {
    redirect(`/admin/products/${id}/edit?error=invalid-numbers`);
  }

  if (!Number.isInteger(priceCents) || !Number.isInteger(stockQuantity)) {
    redirect(`/admin/products/${id}/edit?error=invalid-numbers`);
  }

  if (pressingYear && (pressingYear < 1900 || pressingYear > 2030)) {
    redirect(`/admin/products/${id}/edit?error=invalid-year`);
  }

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
      status: nextStatus,
      updatedAt: new Date(),
      version: product.version + 1,
    })
    .where(and(eq(schema.products.id, id), isNull(schema.products.deletedAt)));

  revalidateProductPaths(id);
  redirect("/admin/products?updated=1");
}

export async function archiveProduct(id: string) {
  "use server";
  await requireAuthenticatedAdmin();
  await archiveProductRecord(id);
  revalidateProductPaths(id);
}

export async function relistProduct(id: string) {
  "use server";
  await requireAuthenticatedAdmin();
  await relistProductRecord(id);
  revalidateProductPaths(id);
}

export async function restoreProduct(id: string) {
  "use server";
  await requireAuthenticatedAdmin();
  await relistProductRecord(id);
  revalidateProductPaths(id);
}

export async function relistSoldOutProduct(id: string) {
  "use server";
  await requireAuthenticatedAdmin();
  await relistProductRecord(id);
  revalidateProductPaths(id);
}

export async function deleteProduct(id: string) {
  "use server";
  await requireAuthenticatedAdmin();
  await deleteProductRecord(id);
  revalidateProductPaths(id);
}

export async function putItemOnSale(formData: FormData) {
  "use server";
  await requireAuthenticatedAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const priceRaw = String(formData.get("priceCents") ?? "0").trim();
  const priceCents = Math.round(Number(priceRaw));

  if (!id) return;
  if (!Number.isFinite(priceCents) || priceCents < 0) return;

  const d = db();

  // Fetch product to get discogsReleaseId
  const [product] = await d
    .select({
      id: schema.products.id,
      discogsReleaseId: schema.products.discogsReleaseId,
    })
    .from(schema.products)
    .where(and(eq(schema.products.id, id), isNull(schema.products.deletedAt)));

  if (!product) return;

  // Fetch Discogs images if the product has a release ID and no images yet
  if (product.discogsReleaseId) {
    const existingImages = await d
      .select({ id: schema.productImages.id })
      .from(schema.productImages)
      .where(eq(schema.productImages.productId, id))
      .limit(1);

    if (existingImages.length === 0) {
      try {
        const token = process.env.DISCOGS_USER_TOKEN?.trim();
        const userAgent = process.env.DISCOGS_USER_AGENT?.trim() || "vinyl-marketplace-production/1.0";
        if (token) {
          const res = await fetch(
            `https://api.discogs.com/releases/${product.discogsReleaseId}`,
            { headers: { Authorization: `Discogs token=${token}`, "User-Agent": userAgent }, cache: "no-store" }
          );
          if (res.ok) {
            const release = await res.json() as { images?: Array<{ type?: string; uri?: string; uri150?: string }> };
            const ordered = (release.images ?? []).sort((a, b) => {
              if (a.type === "primary" && b.type !== "primary") return -1;
              if (a.type !== "primary" && b.type === "primary") return 1;
              return 0;
            });
            const urls = Array.from(new Set(
              ordered.map((img) => img.uri?.trim() ?? img.uri150?.trim() ?? "").filter(Boolean)
            )).slice(0, 4);
            if (urls.length > 0) {
              await d.insert(schema.productImages).values(
                urls.map((url, sortOrder) => ({ id: crypto.randomUUID(), productId: id, url, sortOrder }))
              );
            }
          }
        }
      } catch {
        // Image fetch failure should not block putting item on sale
      }
    }
  }

  await d
    .update(schema.products)
    .set({ priceCents, status: "active", stockQuantity: 1, updatedAt: new Date() })
    .where(and(eq(schema.products.id, id), isNull(schema.products.deletedAt)));

  revalidateProductPaths(id);
}

export async function bulkUpdateProducts(formData: FormData) {
  "use server";
  await requireAuthenticatedAdmin();

  const intent = String(formData.get("intent") ?? "").trim();
  const returnToRaw = formData.get("returnTo");
  const returnTo =
    typeof returnToRaw === "string" && returnToRaw.startsWith("/admin/")
      ? returnToRaw
      : "/admin/products";
  const selectedIds = Array.from(
    new Set(
      formData
        .getAll("selectedIds")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );

  if (selectedIds.length === 0) {
    redirect(returnTo);
  }

  if (intent === "hide") {
    await Promise.all(selectedIds.map((id) => archiveProductRecord(id)));
  } else if (intent === "relist") {
    await Promise.all(selectedIds.map((id) => relistProductRecord(id)));
  } else if (intent === "delete") {
    await Promise.all(selectedIds.map((id) => deleteProductRecord(id)));
  } else {
    redirect(returnTo);
  }

  revalidateProductPaths();
  redirect(returnTo);
}
