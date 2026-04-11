import { db } from "@/db";
import { count, desc } from "drizzle-orm";
import { schema } from "@/db";
import Link from "next/link";
import { requireAuthenticatedAdmin } from "@/lib/auth";
import { formatEuroFromCents } from "@/lib/money";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAuthenticatedAdmin();

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const d = db();
  const [{ total }] = await d.select({ total: count() }).from(schema.orders);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const orders = await d.query.orders.findMany({
    orderBy: [desc(schema.orders.createdAt)],
    limit: PAGE_SIZE,
    offset: (currentPage - 1) * PAGE_SIZE,
  });

  const statusColors: Record<string, string> = {
    pending: "text-amber-700",
    processing: "text-sky-700",
    shipped: "text-violet-700",
    delivered: "text-emerald-700",
    cancelled: "text-rose-700",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">Orders ({total})</h1>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-hover">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-foreground">Order #</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Method</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Total</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Date</th>
              <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                <td className="px-4 py-3 font-mono text-accent">{order.orderNumber}</td>
                <td className="px-4 py-3 text-foreground">{order.customerEmail}</td>
                <td className="px-4 py-3 text-muted capitalize">
                  {order.paymentMethod} / {order.deliveryMethod}
                </td>
                <td className="px-4 py-3 text-foreground">{formatEuroFromCents(order.totalCents)}</td>
                <td className={`px-4 py-3 font-medium capitalize ${statusColors[order.status] ?? "text-foreground"}`}>
                  {order.status}
                </td>
                <td className="px-4 py-3 text-muted">{order.createdAt?.toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/orders/${order.id}`} className="text-accent hover:underline text-sm">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-border bg-white px-4 py-3">
          <p className="text-sm text-muted">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, total)} of {total} orders
          </p>
          <div className="flex items-center gap-2">
            {currentPage > 1 ? (
              <Link href={`/admin/orders?page=${currentPage - 1}`} className="btn-secondary text-sm">Previous</Link>
            ) : (
              <button type="button" className="btn-secondary text-sm" disabled>Previous</button>
            )}
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Page {currentPage} / {totalPages}
            </span>
            {currentPage < totalPages ? (
              <Link href={`/admin/orders?page=${currentPage + 1}`} className="btn-secondary text-sm">Next</Link>
            ) : (
              <button type="button" className="btn-secondary text-sm" disabled>Next</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
