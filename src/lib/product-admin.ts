import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ProductStatus } from "@/types/product";

type ProductRecord = typeof schema.products.$inferSelect;

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
