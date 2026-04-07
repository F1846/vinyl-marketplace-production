import { db } from "@/db";
import { eq, desc } from "drizzle-orm";
import { schema } from "@/db";
import Link from "next/link";
import { Plus, Pencil, EyeOff } from "lucide-react";
import { archiveProduct } from "@/actions/products";

export default async function AdminProductsPage() {
  const d = db();
  const products = await d.query.products.findMany({
    orderBy: [desc(schema.products.createdAt)],
    with: { images: { orderBy: [schema.productImages.sortOrder] } },
  });

  const statusBadge = (status: string) => {
    const cls: Record<string, string> = {
      active: "badge-active",
      sold_out: "badge-sold",
      archived: "badge-archived",
    }[status] || "badge";
    return <span className={cls}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Products ({products.length})</h1>
        <Link href="/admin/products/new" className="btn-primary text-sm">
          <Plus className="h-4 w-4" /> Add Product
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted">Product</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Format</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Price</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Stock</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                <td className="px-4 py-3 text-foreground">{product.artist} &ndash; {product.title}</td>
                <td className="px-4 py-3"><span className={`badge badge-${product.format}`}>{product.format}</span></td>
                <td className="px-4 py-3 text-foreground">${(product.priceCents / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-foreground">{product.stockQuantity}</td>
                <td className="px-4 py-3">{statusBadge(product.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/products/${product.id}/edit`} title="Edit" className="text-muted hover:text-accent transition-colors">
                      <Pencil className="h-4 w-4" />
                    </Link>
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
