import { db } from "@/db";
import { and, asc, desc, isNull, ne, sql } from "drizzle-orm";
import { schema } from "@/db";
import { requireAuthenticatedAdmin } from "@/lib/auth";
import { resolveProductStatus } from "@/lib/product-admin";
import type { ProductStatus } from "@/types/product";
import { AdminProductsTable } from "@/components/admin/admin-products-table";

export const dynamic = "force-dynamic";

type SortKey = "created" | "price" | "stock" | "status";
type SortDirection = "asc" | "desc";

function parseSortKey(value?: string): SortKey {
  if (value === "price" || value === "stock" || value === "status") {
    return value;
  }
  return "created";
}

function parseSortDirection(value?: string): SortDirection {
  return value === "asc" ? "asc" : "desc";
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; sort?: string; dir?: string }>;
}) {
  await requireAuthenticatedAdmin();
  const params = await searchParams;
  const sort = parseSortKey(params.sort);
  const dir = parseSortDirection(params.dir);

  const d = db();
  const statusOrder = sql<number>`
    case
      when ${schema.products.status} = 'active' and ${schema.products.stockQuantity} > 0 then 0
      when ${schema.products.status} = 'sold_out' then 1
      when ${schema.products.status} = 'active' and ${schema.products.stockQuantity} <= 0 then 1
      when ${schema.products.status} = 'archived' then 2
      else 3
    end
  `;
  const orderBy =
    sort === "price"
      ? [dir === "asc" ? asc(schema.products.priceCents) : desc(schema.products.priceCents), desc(schema.products.createdAt)]
      : sort === "stock"
        ? [
            dir === "asc"
              ? asc(schema.products.stockQuantity)
              : desc(schema.products.stockQuantity),
            desc(schema.products.createdAt),
          ]
        : sort === "status"
          ? [dir === "asc" ? asc(statusOrder) : desc(statusOrder), desc(schema.products.createdAt)]
          : [desc(schema.products.createdAt)];
  // Products page shows only active/sold_out items — archived (collection imports) live in Inventory
  const products = await d.query.products.findMany({
    where: and(
      isNull(schema.products.deletedAt),
      ne(schema.products.status, "archived")
    ),
    orderBy,
    with: {
      images: {
        orderBy: [schema.productImages.sortOrder],
        limit: 1,
      },
    },
  });
  const productRows = products.map((product) => ({
    id: product.id,
    artist: product.artist,
    title: product.title,
    format: product.format,
    priceCents: product.priceCents,
    stockQuantity: product.stockQuantity,
    status: resolveProductStatus(product) as ProductStatus,
    imageUrl: product.images[0]?.url ?? null,
    pressingLabel: product.pressingLabel,
    pressingCatalogNumber: product.pressingCatalogNumber,
    pressingYear: product.pressingYear,
    discogsReleaseId: product.discogsReleaseId,
  }));

  return (
    <div className="space-y-6">
      {params.updated === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-success">
          Product updated successfully.
        </div>
      )}
      <AdminProductsTable
        products={productRows}
        productCountLabel={products.length}
        sort={sort}
        dir={dir}
        updated={params.updated}
      />
    </div>
  );
}
