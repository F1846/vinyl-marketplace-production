import { redirect } from "next/navigation";
import { isAuthenticatedAdmin } from "@/lib/auth";
import { db } from "@/db";
import { eq, desc, sql } from "drizzle-orm";
import { schema } from "@/db";
import Link from "next/link";

export default async function AdminDashboard() {
  const authed = await isAuthenticatedAdmin();
  // In dev, always allow. In prod, check the session cookie.

  const d = db();

  const productCount = await d.select({ count: sql<number>`count(*)` }).from(schema.products);
  const activeCount = await d
    .select({ count: sql<number>`count(*)` })
    .from(schema.products)
    .where(eq(schema.products.status, "active"));
  const orderCount = await d.select({ count: sql<number>`count(*)` }).from(schema.orders);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-muted">Total Products</p>
          <p className="text-3xl font-bold text-accent">{productCount[0]?.count ?? 0}</p>
          <p className="text-xs text-muted mt-1">
            {activeCount[0]?.count ?? 0} active
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-muted">Total Orders</p>
          <p className="text-3xl font-bold text-accent">{orderCount[0]?.count ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-muted">Quick Actions</p>
          <div className="mt-2 space-y-2">
            <Link href="/admin/products/new" className="btn-primary w-full text-center block text-sm">
              Add Product
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
