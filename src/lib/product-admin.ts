import { and, eq, isNull, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import type { MediaCondition, ProductFormat, ProductStatus } from "@/types/product";

type ProductRecord = typeof schema.products.$inferSelect;
const DISCOGS_API_BASE = "https://api.discogs.com";
const DEFAULT_USER_AGENT =
  "vinyl-marketplace-production/1.0 +https://www.federicoshop.de";

export type ProductIdentityInput = {
  artist: string;
  title: string;
  format: ProductFormat;
  pressingYear: number | null;
  pressingLabel: string | null;
  pressingCatalogNumber: string | null;
  conditionMedia: MediaCondition | null;
  conditionSleeve: MediaCondition | null;
};

function visibleProductWhere(id: string) {
  return and(eq(schema.products.id, id), isNull(schema.products.deletedAt));
}

function visibleMatchingProductWhere(input: ProductIdentityInput, status?: ProductStatus) {
  return and(
    buildProductIdentityWhere(input),
    status ? eq(schema.products.status, status) : undefined
  );
}

export function buildProductIdentityWhere(input: ProductIdentityInput) {
  const yearCondition =
    input.pressingYear != null
      ? eq(schema.products.pressingYear, input.pressingYear)
      : isNull(schema.products.pressingYear);
  const labelCondition =
    input.pressingLabel != null
      ? eq(schema.products.pressingLabel, input.pressingLabel)
      : isNull(schema.products.pressingLabel);
  const catalogNumberCondition =
    input.pressingCatalogNumber != null
      ? eq(schema.products.pressingCatalogNumber, input.pressingCatalogNumber)
      : isNull(schema.products.pressingCatalogNumber);
  const mediaCondition =
    input.conditionMedia != null
      ? eq(schema.products.conditionMedia, input.conditionMedia)
      : isNull(schema.products.conditionMedia);
  const sleeveCondition =
    input.conditionSleeve != null
      ? eq(schema.products.conditionSleeve, input.conditionSleeve)
      : isNull(schema.products.conditionSleeve);

  return and(
    eq(schema.products.artist, input.artist),
    eq(schema.products.title, input.title),
    eq(schema.products.format, input.format),
    yearCondition,
    labelCondition,
    catalogNumberCondition,
    mediaCondition,
    sleeveCondition,
    isNull(schema.products.deletedAt)
  );
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
        displayZoom: 0.96,
      }))
    );
  } catch {
    // Image fetching should never block admin publishing flows.
  }
}

async function copyProductImages(sourceProductId: string, targetProductId: string): Promise<void> {
  const images = await db()
    .select({
      url: schema.productImages.url,
      sortOrder: schema.productImages.sortOrder,
      displayZoom: schema.productImages.displayZoom,
    })
    .from(schema.productImages)
    .where(eq(schema.productImages.productId, sourceProductId));

  if (images.length === 0) {
    return;
  }

  await db().insert(schema.productImages).values(
    images.map((image) => ({
      id: crypto.randomUUID(),
      productId: targetProductId,
      url: image.url,
      sortOrder: image.sortOrder,
      displayZoom: image.displayZoom,
    }))
  );
}

async function softDeleteMergedProduct(product: ProductRecord) {
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
    .where(visibleProductWhere(product.id));
}

async function moveBackToArchivedInventory(product: ProductRecord): Promise<boolean> {
  const mergeQuantity =
    product.status === "sold_out" ? Math.max(product.stockQuantity, 0) : Math.max(product.stockQuantity, 1);

  const existingArchived = await db().query.products.findFirst({
    where: and(
      visibleMatchingProductWhere(product, "archived"),
      ne(schema.products.id, product.id)
    ),
  });

  if (existingArchived) {
    await db()
      .update(schema.products)
      .set({
        priceCents: product.priceCents > 0 ? product.priceCents : existingArchived.priceCents,
        stockQuantity: existingArchived.stockQuantity + mergeQuantity,
        updatedAt: new Date(),
        version: existingArchived.version + 1,
      })
      .where(visibleProductWhere(existingArchived.id));

    await softDeleteMergedProduct(product);
    return true;
  }

  await db()
    .update(schema.products)
    .set({
      status: "archived",
      updatedAt: new Date(),
      version: product.version + 1,
    })
    .where(visibleProductWhere(product.id));

  return true;
}

export async function archiveProductRecord(id: string): Promise<boolean> {
  const product = await getVisibleProductById(id);
  if (!product) {
    return false;
  }

  if (product.status === "archived") {
    return true;
  }

  await moveBackToArchivedInventory(product);

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

  const existingLiveCopy = await db().query.products.findFirst({
    where: and(
      visibleMatchingProductWhere(product),
      ne(schema.products.status, "archived"),
      ne(schema.products.id, product.id)
    ),
    with: {
      images: {
        orderBy: [schema.productImages.sortOrder],
      },
    },
  });

  if (product.status === "archived") {
    if (existingLiveCopy) {
      const nextLiveStock =
        existingLiveCopy.status === "active" && existingLiveCopy.stockQuantity > 0
          ? existingLiveCopy.stockQuantity
          : 1;

      await db()
        .update(schema.products)
        .set({
          priceCents: nextPriceCents,
          stockQuantity: nextLiveStock,
          status: "active",
          updatedAt: new Date(),
          version: existingLiveCopy.version + 1,
        })
        .where(visibleProductWhere(existingLiveCopy.id));

      if (!(existingLiveCopy.status === "active" && existingLiveCopy.stockQuantity > 0)) {
        const nextArchivedQuantity = Math.max(product.stockQuantity - 1, 0);
        if (nextArchivedQuantity === 0) {
          await softDeleteMergedProduct(product);
        } else {
          await db()
            .update(schema.products)
            .set({
              stockQuantity: nextArchivedQuantity,
              status: "archived",
              updatedAt: new Date(),
              version: product.version + 1,
            })
            .where(visibleProductWhere(product.id));
        }
      }

      return true;
    }

    if (product.stockQuantity > 1) {
      const nextArchivedQuantity = product.stockQuantity - 1;
      const nextProductId = crypto.randomUUID();

      await db()
        .update(schema.products)
        .set({
          stockQuantity: nextArchivedQuantity,
          status: "archived",
          updatedAt: new Date(),
          version: product.version + 1,
        })
        .where(visibleProductWhere(product.id));

      await db().insert(schema.products).values({
        id: nextProductId,
        artist: product.artist,
        title: product.title,
        format: product.format,
        genre: product.genre,
        priceCents: nextPriceCents,
        stockQuantity: 1,
        conditionMedia: product.conditionMedia,
        conditionSleeve: product.conditionSleeve,
        pressingLabel: product.pressingLabel,
        pressingYear: product.pressingYear,
        pressingCatalogNumber: product.pressingCatalogNumber,
        discogsListingId: null,
        discogsReleaseId: product.discogsReleaseId,
        description: product.description,
        status: "active",
        version: 1,
      });

      await copyProductImages(product.id, nextProductId);
      const insertedProduct = await getVisibleProductById(nextProductId);
      if (insertedProduct) {
        await ensureProductImages(insertedProduct);
      }

      return true;
    }
  }

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

export async function updateProductStockRecord(
  id: string,
  stockQuantity: number
): Promise<boolean> {
  const product = await getVisibleProductById(id);
  if (!product) {
    return false;
  }

  const nextStockQuantity = Math.max(0, Math.round(stockQuantity));

  await db()
    .update(schema.products)
    .set({
      stockQuantity: nextStockQuantity,
      status: resolveProductStatus({
        status: product.status,
        stockQuantity: nextStockQuantity,
      }),
      updatedAt: new Date(),
      version: product.version + 1,
    })
    .where(visibleProductWhere(id));

  return true;
}
