import Link from "next/link";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAuthenticatedAdmin } from "@/lib/auth";
import { isTrackingSyncConfigured, syncOrderTracking } from "@/lib/order-tracking";
import { notFound } from "next/navigation";
import {
  saveOrderTracking,
  syncOrderTrackingAction,
  updateOrderStatus,
} from "@/actions/orders";
import {
  allOrderStatuses,
  type ShippingAddress,
  type TrackingSummary,
} from "@/types/order";
import { formatEuroFromCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuthenticatedAdmin();

  const { id } = await params;
  const d = db();
  const foundOrder = await d.query.orders.findFirst({
    where: eq(schema.orders.id, id),
  });

  if (!foundOrder) notFound();

  let order = foundOrder;
  let trackingSummary: TrackingSummary | null = null;
  let trackingError: string | null = null;

  if (order.trackingNumber && isTrackingSyncConfigured()) {
    try {
      const synced = await syncOrderTracking(order);
      order = synced.order;
      trackingSummary = synced.trackingSummary;
    } catch (error) {
      trackingError =
        error instanceof Error ? error.message : "Tracking could not be refreshed right now.";
    }
  }

  const shippingAddress = order.shippingAddress as ShippingAddress;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Admin order detail
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            Order {order.orderNumber}
          </h1>
        </div>
        <Link href="/admin/orders" className="btn-secondary">
          Back to orders
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <div className="space-y-6">
          <div className="card space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">Status</h2>
              <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Current: {order.status}
              </span>
            </div>

            <form action={updateOrderStatus.bind(null, order.id)} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label htmlFor="newStatus" className="label">
                  Set order status
                </label>
                <select id="newStatus" name="newStatus" className="input" defaultValue={order.status}>
                  {allOrderStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary">
                Save status
              </button>
            </form>

            <p className="text-xs leading-6 text-muted">
              You can move the order forward or backward here if you need to correct it.
            </p>
          </div>

          <div className="card space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">Tracking</h2>
              {order.trackingNumber && (
                <form action={syncOrderTrackingAction.bind(null, order.id)}>
                  <button type="submit" className="btn-secondary">
                    Check tracking now
                  </button>
                </form>
              )}
            </div>

            <form action={saveOrderTracking.bind(null, order.id)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="trackingCarrier" className="label">
                    Carrier slug or tracking URL
                  </label>
                  <input
                    id="trackingCarrier"
                    name="trackingCarrier"
                    className="input"
                    defaultValue={order.trackingCarrier ?? ""}
                    placeholder="Optional: dhl, ups, gls, or https://.../{trackingNumber}"
                  />
                </div>
                <div>
                  <label htmlFor="trackingNumber" className="label">
                    Tracking number
                  </label>
                  <input
                    id="trackingNumber"
                    name="trackingNumber"
                    className="input"
                    defaultValue={order.trackingNumber ?? ""}
                    placeholder="Enter tracking number"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="submit" className="btn-primary">
                  Save tracking
                </button>
              </div>
            </form>

            {trackingSummary ? (
              <div className="rounded-[1rem] border border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Carrier update
                    </p>
                    <p className="mt-1 text-base font-semibold text-foreground">
                      {trackingSummary.carrierStatusLabel}
                    </p>
                  </div>
                  {trackingSummary.trackingUrl && (
                    <a
                      href={trackingSummary.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-accent hover:underline"
                    >
                      Open carrier page
                    </a>
                  )}
                </div>

                <div className="mt-3 space-y-1 text-sm text-muted">
                  <p>
                    {trackingSummary.carrierName ?? trackingSummary.carrierSlug ?? "Carrier"} /{" "}
                    <code className="text-foreground">{trackingSummary.trackingNumber}</code>
                  </p>
                  {trackingSummary.message && <p>{trackingSummary.message}</p>}
                  {trackingSummary.lastUpdatedAt && (
                    <p>
                      Latest update:{" "}
                      {new Date(trackingSummary.lastUpdatedAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {trackingSummary.checkpoints.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {trackingSummary.checkpoints.slice(0, 4).map((checkpoint, index) => (
                      <div
                        key={`${checkpoint.timestamp ?? "checkpoint"}-${index}`}
                        className="rounded-[1rem] border border-border bg-white p-3"
                      >
                        <p className="text-sm font-medium text-foreground">{checkpoint.message}</p>
                        <p className="mt-1 text-xs text-muted">
                          {[checkpoint.location, checkpoint.timestamp ? new Date(checkpoint.timestamp).toLocaleString() : null]
                            .filter(Boolean)
                            .join(" / ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : order.trackingNumber ? (
              <div className="rounded-[1rem] border border-border bg-background p-4 text-sm text-muted">
                {trackingError ??
                  (isTrackingSyncConfigured()
                    ? "Waiting for the tracking service to return updates."
                    : "Tracking sync is ready in code. Add AFTERSHIP_API_KEY to production to enable automatic carrier updates.")}
              </div>
            ) : (
              <p className="text-sm text-muted">No tracking number saved yet.</p>
            )}
          </div>

          <div className="card space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Customer</h2>
            <p className="text-sm text-foreground">{order.customerName}</p>
            <p className="text-sm text-muted">{order.customerEmail}</p>
            <p className="text-sm capitalize text-muted">
              Payment: {order.paymentMethod} / Delivery: {order.deliveryMethod}
            </p>
          </div>

          <div className="card space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              {order.deliveryMethod === "pickup" ? "Pickup details" : "Shipping address"}
            </h2>
            <pre className="whitespace-pre-wrap text-sm text-muted">
              {[
                shippingAddress.name,
                shippingAddress.email,
                shippingAddress.phoneNumber ?? shippingAddress.phone,
                shippingAddress.line1,
                shippingAddress.additionalInfo ?? shippingAddress.line2,
                [shippingAddress.postalCode, shippingAddress.city, shippingAddress.state]
                  .filter(Boolean)
                  .join(" "),
                shippingAddress.country,
                shippingAddress.pickupNote,
              ]
                .filter(Boolean)
                .join("\n")}
            </pre>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card space-y-2">
            <div className="flex justify-between text-sm text-muted">
              <span>Subtotal</span>
              <span>{formatEuroFromCents(order.subtotalCents)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted">
              <span>Shipping</span>
              <span>{formatEuroFromCents(order.shippingCents)}</span>
            </div>
            <div className="border-t border-border pt-2">
              <div className="flex justify-between text-lg font-bold text-foreground">
                <span>Total</span>
                <span>{formatEuroFromCents(order.totalCents)}</span>
              </div>
            </div>
          </div>

          <div className="card space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Tracking code</h2>
            {order.trackingNumber ? (
              <p className="text-sm text-foreground">
                {order.trackingCarrier || "Auto-detect"}:{" "}
                <code className="text-accent">{order.trackingNumber}</code>
              </p>
            ) : (
              <p className="text-sm text-muted">No tracking number yet.</p>
            )}
          </div>

          <div className="card space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Dates</h2>
            <p className="text-sm text-muted">
              Created: {new Date(order.createdAt).toLocaleString()}
            </p>
            <p className="text-sm text-muted">
              Updated: {new Date(order.updatedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
