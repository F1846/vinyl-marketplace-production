import { db } from "@/db";
import { asc, desc, isNull, sql } from "drizzle-orm";
import { schema } from "@/db";
import { requireAuthenticatedAdmin } from "@/lib/auth";
import Link from "next/link";
import { Plus, Pencil, EyeOff, RotateCcw, ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import {
  archiveProduct,
  deleteProduct,
  relistProduct,
} from "@/actions/products";
import { resolveProductStatus } from "@/lib/product-admin";
import type { ProductStatus } from "@/types/product";
import { formatEuroFromCents } from "@/lib/money";

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
  const products = await d.query.products.findMany({
    where: isNull(schema.products.deletedAt),
    orderBy,
    with: { images: { orderBy: [schema.productImages.sortOrder] } },
  });

  const statusBadge = (status: ProductStatus) => {
    const cls = {
      active: "badge-active",
      sold_out: "badge-sold",
      archived: "badge-archived",
    }[status];
    return <span className={cls}>{status}</span>;
  };

  const buildSortHref = (column: Exclude<SortKey, "created">) => {
    const nextParams = new URLSearchParams();
    const nextDirection: SortDirection =
      sort === column ? (dir === "asc" ? "desc" : "asc") : "desc";

    if (params.updated) {
      nextParams.set("updated", params.updated);
    }

    nextParams.set("sort", column);
    nextParams.set("dir", nextDirection);

    return `/admin/products?${nextParams.toString()}`;
  };

  const renderSortHeader = (label: string, column: Exclude<SortKey, "created">) => {
    const isActive = sort === column;
    const Icon = isActive && dir === "asc" ? ArrowUp : ArrowDown;

    return (
      <Link
        href={buildSortHref(column)}
        className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
      >
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5" />
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      {params.updated === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-success">
          Product updated successfully.
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Products ({products.length})</h1>
        <div className="flex gap-2">
          <Link href="/admin/import" className="btn-secondary text-sm">
            Import CSV
          </Link>
          <Link href="/admin/products/new" className="btn-primary text-sm">
            <Plus className="h-4 w-4" /> Add Product
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-hover">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-foreground">Product</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Format</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">
                {renderSortHeader("Price", "price")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-foreground">
                {renderSortHeader("Stock", "stock")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-foreground">
                {renderSortHeader("Status", "status")}
              </th>
              <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                <td className="px-4 py-3 text-foreground">{product.artist} &ndash; {product.title}</td>
                <td className="px-4 py-3"><span className={`badge badge-${product.format}`}>{product.format}</span></td>
                <td className="px-4 py-3 text-foreground">{formatEuroFromCents(product.priceCents)}</td>
                <td className="px-4 py-3 text-foreground">{product.stockQuantity}</td>
                <td className="px-4 py-3">{statusBadge(resolveProductStatus(product))}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end flex-wrap gap-2">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted transition-colors hover:border-accent hover:text-accent"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                    {resolveProductStatus(product) !== "active" && (
                      <form action={relistProduct.bind(null, product.id)}>
                        <button
                          type="submit"
                          title={
                            product.stockQuantity > 0
                              ? "Relist this product in the catalog"
                              : "Relist this product and set stock to 1"
                          }
                          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted transition-colors hover:border-success hover:text-success"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Relist
                        </button>
                      </form>
                    )}
                    {resolveProductStatus(product) === "active" && (
                      <form action={archiveProduct.bind(null, product.id)}>
                        <button
                          type="submit"
                          title="Hide from catalog"
                          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted transition-colors hover:border-danger hover:text-danger"
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                          Hide
                        </button>
                      </form>
                    )}
                    <form action={deleteProduct.bind(null, product.id)}>
                      <button
                        type="submit"
                        title="Remove this product from admin and storefront"
                        className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted transition-colors hover:border-danger hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
