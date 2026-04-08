import { db } from "@/db";
import { desc } from "drizzle-orm";
import { schema } from "@/db";
import { requireAuthenticatedAdmin } from "@/lib/auth";
import Link from "next/link";
import { Plus, Pencil, EyeOff, RotateCcw } from "lucide-react";
import { archiveProduct, restoreProduct } from "@/actions/products";
import type { ProductStatus } from "@/types/product";
import { formatEuroFromCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  await requireAuthenticatedAdmin();
  const params = await searchParams;

  const d = db();
  const products = await d.query.products.findMany({
    orderBy: [desc(schema.products.createdAt)],
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
              <th className="px-4 py-3 text-left font-medium text-foreground">Price</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Stock</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
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
                <td className="px-4 py-3">{statusBadge(product.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <Link href={`/admin/products/${product.id}/edit`} title="Edit" className="text-muted hover:text-accent transition-colors">
                      <Pencil className="h-4 w-4" />
                    </Link>
                    {product.status !== "active" && (
                      <form action={restoreProduct.bind(null, product.id)}>
                        <button
                          type="submit"
                          title={
                            product.stockQuantity > 0
                              ? "Relist"
                              : "Set stock above 0 in Edit before relisting"
                          }
                          className="text-muted hover:text-success transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={product.stockQuantity < 1}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </form>
                    )}
                    {product.status !== "archived" && (
                      <form action={archiveProduct.bind(null, product.id)}>
                        <button type="submit" title="Archive" className="text-muted hover:text-danger transition-colors">
                          <EyeOff className="h-4 w-4" />
                        </button>
                      </form>
                    )}
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
