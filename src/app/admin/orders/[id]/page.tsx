import { db } from "@/db";
import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { notFound } from "next/navigation";
import { updateOrderStatus } from "@/actions/orders";
import { getValidNextStates, type ShippingAddress } from "@/types/order";
import { formatEuroFromCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const d = db();
  const order = await d.query.orders.findFirst({
    where: eq(schema.orders.id, id),
  });

  if (!order) notFound();

  const validNextStates = getValidNextStates(order.status);
  const shippingAddress = order.shippingAddress as ShippingAddress;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-bold text-foreground">Order {order.orderNumber}</h1>

      {/* Status + Update */}
      <div className="card space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Status: <span className="capitalize text-accent">{order.status}</span>
        </h2>
        {validNextStates.length > 0 && (
          <form action={updateOrderStatus.bind(null, order.id)} className="flex gap-3 items-end">
            <div>
              <label htmlFor="newStatus" className="label">Update Status</label>
              <select id="newStatus" name="newStatus" className="input" defaultValue="">
                <option value="" disabled>Choose next status</option>
                {validNextStates.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary">Update</button>
          </form>
        )}
      </div>

      {/* Customer info */}
      <div className="card space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Customer</h2>
        <p className="text-sm text-foreground">{order.customerName}</p>
        <p className="text-sm text-muted">{order.customerEmail}</p>
      </div>

      {/* Shipping address */}
      <div className="card space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Shipping Address</h2>
          <pre className="text-sm text-muted whitespace-pre-wrap">
            {[
            shippingAddress.name,
            shippingAddress.line1,
            shippingAddress.line2,
            [shippingAddress.city, shippingAddress.state, shippingAddress.postalCode].filter(Boolean).join(" "),
            shippingAddress.country,
          ].filter(Boolean).join("\n")}
        </pre>
      </div>

      {/* Tracking */}
      <div className="card space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Tracking</h2>
        {order.trackingNumber ? (
          <p className="text-sm text-foreground">
            {order.trackingCarrier}: <code className="text-accent">{order.trackingNumber}</code>
          </p>
        ) : (
          <p className="text-sm text-muted">No tracking number yet</p>
        )}
      </div>

      {/* Totals */}
      <div className="card space-y-2">
        <div className="flex justify-between text-sm text-muted">
          <span>Subtotal</span><span>{formatEuroFromCents(order.subtotalCents)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted">
          <span>Shipping</span><span>{formatEuroFromCents(order.shippingCents)}</span>
        </div>
        <div className="border-t border-border pt-2 flex justify-between text-lg font-bold text-foreground">
          <span>Total</span><span>{formatEuroFromCents(order.totalCents)}</span>
        </div>
      </div>
    </div>
  );
}
