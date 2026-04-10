import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ProductStatus } from "@/types/product";

type ProductRecord = typeof schema.products.$inferSelect;
const DISCOGS_API_BASE = "https://api.discogs.com";
const DEFAULT_USER_AGENT =
  "vinyl-marketplace-production/1.0 +https://www.federicoshop.de";

function visibleProductWhere(id: string) {
  return and(eq(schema.products.id, id), isNull(schema.products.deletedAt));
}

export function resolveProductStatus(input: {
  status: ProductStatus;
  stockQuantity: number;
}): ProductStatus {
  if (input.status === "archived") {
    return "archived";
  }

  return input.stockQuantity > 0 ? "active" : "sold_out";
}

export async function getVisibleProductById(id: string): Promise<ProductRecord | null> {
  const product = await db().query.products.findFirst({
    where: visibleProductWhere(id),
  });

  return product ?? null;
}

async function ensureProductImages(product: ProductRecord): Promise<void> {
  if (!product.discogsReleaseId) {
    return;
  }

  const existingImages = await db()
    .select({ id: schema.productImages.id })
    .from(schema.productImages)
    .where(eq(schema.productImages.productId, product.id))
    .limit(1);

  if (existingImages.length > 0) {
    return;
  }

  const token = process.env.DISCOGS_USER_TOKEN?.trim();
  if (!token) {
    return;
  }

  const userAgent = process.env.DISCOGS_USER_AGENT?.trim() || DEFAULT_USER_AGENT;

  try {
    const response = await fetch(
      `${DISCOGS_API_BASE}/releases/${product.discogsReleaseId}`,
      {
        headers: {
          Authorization: `Discogs token=${token}`,
          "User-Agent": userAgent,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return;
    }

    const release = (await response.json()) as {
      images?: Array<{ type?: string; uri?: string; uri150?: string }>;
    };

    const urls = Array.from(
      new Set(
        (release.images ?? [])
          .sort((left, right) => {
            if (left.type === "primary" && right.type !== "primary") return -1;
            if (left.type !== "primary" && right.type === "primary") return 1;
            return 0;
          })
          .map((image) => image.uri?.trim() ?? image.uri150?.trim() ?? "")
          .filter(Boolean)
      )
    ).slice(0, 4);

    if (urls.length === 0) {
      return;
    }

    await db().insert(schema.productImages).values(
      urls.map((url, sortOrder) => ({
        id: crypto.randomUUID(),
        productId: product.id,
        url,
        sortOrder,
      }))
    );
  } catch {
    // Image fetching should never block admin publishing flows.
  }
}

export async function archiveProductRecord(id: string): Promise<boolean> {
  const product = await getVisibleProductById(id);
  if (!product) {
    return false;
  }

  await db()
    .update(schema.products)
    .set({
      status: "archived",
      updatedAt: new Date(),
      version: product.version + 1,
    })
    .where(visibleProductWhere(id));

  return true;
}

export async function relistProductRecord(id: string): Promise<boolean> {
  const product = await getVisibleProductById(id);
  if (!product) {
    return false;
  }

  const nextStockQuantity = product.stockQuantity > 0 ? product.stockQuantity : 1;

  await db()
    .update(schema.products)
    .set({
      stockQuantity: nextStockQuantity,
      status: "active",
      updatedAt: new Date(),
      version: product.version + 1,
    })
    .where(visibleProductWhere(id));

  return true;
}

export async function putProductOnSaleRecord(
  id: string,
  explicitPriceCents?: number
): Promise<boolean> {
  const product = await getVisibleProductById(id);
  if (!product) {
    return false;
  }

  const nextPriceCents =
    typeof explicitPriceCents === "number" && Number.isFinite(explicitPriceCents)
      ? Math.max(0, Math.round(explicitPriceCents))
      : product.priceCents;

  await ensureProductImages(product);

  await db()
    .update(schema.products)
    .set({
      priceCents: nextPriceCents,
      stockQuantity: product.stockQuantity > 0 ? product.stockQuantity : 1,
      status: "active",
      updatedAt: new Date(),
      version: product.version + 1,
    })
    .where(visibleProductWhere(id));

  return true;
}

export async function deleteProductRecord(id: string): Promise<boolean> {
  const product = await getVisibleProductById(id);
  if (!product) {
    return false;
  }

  await db()
    .update(schema.products)
    .set({
      deletedAt: new Date(),
      status: "archived",
      stockQuantity: 0,
      discogsListingId: null,
      updatedAt: new Date(),
      version: product.version + 1,
    })
    .where(visibleProductWhere(id));

  return true;
}
