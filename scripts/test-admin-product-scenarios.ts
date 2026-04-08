import dotenv from "dotenv";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  archiveProductRecord,
  deleteProductRecord,
  relistProductRecord,
  resolveProductStatus,
} from "@/lib/product-admin";

dotenv.config({ path: ".env.local" });
dotenv.config();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const d = db();
  const suffix = Date.now().toString();

  await d.execute(sql`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS deleted_at timestamp
  `);

  await d.execute(sql`
    UPDATE products
    SET status = 'sold_out'::product_status
    WHERE deleted_at IS NULL
      AND status = 'active'::product_status
      AND stock_quantity <= 0
  `);

  const productId = crypto.randomUUID();
  await d.insert(schema.products).values({
    id: productId,
    artist: `Codex Admin Flow ${suffix}`,
    title: "Scenario Product",
    format: "vinyl",
    genre: "Techno",
    priceCents: 1900,
    stockQuantity: 2,
    conditionMedia: "NM",
    conditionSleeve: "NM",
    description: "Temporary integration test product.",
    status: "active",
    version: 1,
  });

  await archiveProductRecord(productId);
  let product = await d.query.products.findFirst({
    where: and(eq(schema.products.id, productId), isNull(schema.products.deletedAt)),
  });
  assert(product?.status === "archived", "Archive should set status to archived.");
  assert(product.stockQuantity === 2, "Archive should preserve stock quantity.");

  await relistProductRecord(productId);
  product = await d.query.products.findFirst({
    where: and(eq(schema.products.id, productId), isNull(schema.products.deletedAt)),
  });
  assert(product?.status === "active", "Relist should reactivate archived products.");
  assert(product.stockQuantity === 2, "Relist should preserve positive stock.");

  await d
    .update(schema.products)
    .set({ stockQuantity: 0, status: "sold_out", updatedAt: new Date() })
    .where(eq(schema.products.id, productId));

  await relistProductRecord(productId);
  product = await d.query.products.findFirst({
    where: and(eq(schema.products.id, productId), isNull(schema.products.deletedAt)),
  });
  assert(product?.status === "active", "Relist should reactivate sold out products.");
  assert(product.stockQuantity === 1, "Relist should set sold out stock back to 1.");

  await d
    .update(schema.products)
    .set({ stockQuantity: 0, status: "archived", updatedAt: new Date() })
    .where(eq(schema.products.id, productId));

  await relistProductRecord(productId);
  product = await d.query.products.findFirst({
    where: and(eq(schema.products.id, productId), isNull(schema.products.deletedAt)),
  });
  assert(product?.status === "active", "Relist should reactivate archived zero-stock products.");
  assert(product.stockQuantity === 1, "Relist should set archived zero-stock products to stock 1.");
  assert(
    resolveProductStatus({ status: "active", stockQuantity: 0 }) === "sold_out",
    "Derived status should treat active zero-stock products as sold_out."
  );

  await deleteProductRecord(productId);
  const visibleDeletedProduct = await d.query.products.findFirst({
    where: and(eq(schema.products.id, productId), isNull(schema.products.deletedAt)),
  });
  assert(!visibleDeletedProduct, "Deleted products should disappear from visible admin queries.");

  const deletedRecord = await d.query.products.findFirst({
    where: eq(schema.products.id, productId),
  });
  assert(deletedRecord?.deletedAt, "Delete should mark deletedAt.");
  assert(deletedRecord.status === "archived", "Delete should archive the product.");
  assert(deletedRecord.stockQuantity === 0, "Delete should zero the stock quantity.");
  assert(deletedRecord.discogsListingId === null, "Delete should clear discogsListingId for re-imports.");

  await d.delete(schema.products).where(eq(schema.products.id, productId));

  console.log("admin product scenarios passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
