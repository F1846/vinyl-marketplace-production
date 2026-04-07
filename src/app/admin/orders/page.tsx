import { db } from "@/db";
import { eq, desc } from "drizzle-orm";
import { schema } from "@/db";
import Link from "next/link";

export default async function AdminOrdersPage() {
  const d = db();
  const orders = await d.query.orders.findMany({
    orderBy: [desc(schema.orders.createdAt)],
  });

  const statusColors: Record<string, string> = {
    pending: "text-yellow-400",
    processing: "text-blue-400",
    shipped: "text-purple-400",
    delivered: "text-green-400",
    cancelled: "text-red-400",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">Orders ({orders.length})</h1>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted">Order #</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Total</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Date</th>
              <th className="px-4 py-3 text-right font-medium text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                <td className="px-4 py-3 font-mono text-accent">{order.orderNumber}</td>
                <td className="px-4 py-3 text-foreground">{order.customerEmail}</td>
                <td className="px-4 py-3 text-foreground">${(order.totalCents / 100).toFixed(2)}</td>
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
    </div>
  );
}
