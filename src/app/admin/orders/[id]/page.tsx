import Image from "next/image";
import Link from "next/link";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAuthenticatedAdmin } from "@/lib/auth";
import { isTrackingSyncConfigured, syncOrderTracking } from "@/lib/order-tracking";
import { notFound } from "next/navigation";
import {
  sendManualOrderEmail,
  saveOrderTracking,
  syncOrderTrackingAction,
  updateOrderStatus,
  updateOrderVat,
} from "@/actions/orders";
import {
  allOrderStatuses,
  type ShippingAddress,
  type TrackingSummary,
} from "@/types/order";
import { formatEuroFromCents } from "@/lib/money";
import { pickupAddressLines, siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  await requireAuthenticatedAdmin();

  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const d = db();
  const foundOrder = await d.query.orders.findFirst({
    where: eq(schema.orders.id, id),
    with: {
      items: {
        with: {
          product: {
            with: {
              images: {
                orderBy: [schema.productImages.sortOrder],
              },
            },
          },
        },
      },
    },
  });

  if (!foundOrder) notFound();

  const { items: orderItems, ...foundOrderBase } = foundOrder;
  let order = foundOrderBase;
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
  const vatRate =
    order.taxCents > 0 && order.subtotalCents + order.shippingCents > 0
      ? (order.taxCents / (order.subtotalCents + order.shippingCents)) * 100
      : 0;
  const addressLines =
    order.deliveryMethod === "pickup"
      ? pickupAddressLines()
      : [
          shippingAddress.name,
          shippingAddress.email,
          shippingAddress.phoneNumber ?? shippingAddress.phone,
          shippingAddress.line1,
          shippingAddress.additionalInfo ?? shippingAddress.line2,
          [shippingAddress.postalCode, shippingAddress.city, shippingAddress.state]
            .filter(Boolean)
            .join(" "),
          shippingAddress.country,
        ].filter(Boolean);
  const emailStatus = resolvedSearchParams.email;
  const defaultManualSubject =
    order.deliveryMethod === "pickup"
      ? `${siteConfig.name} - ${order.orderNumber} - Pickup details`
      : `${siteConfig.name} - ${order.orderNumber} - Order update`;
  const defaultManualMessage =
    order.deliveryMethod === "pickup"
      ? `Hi ${order.customerName},\n\nYour order is ready for local pickup.\n\nPickup address:\n${siteConfig.pickupContactName}\n${siteConfig.pickupStreet}\n${siteConfig.pickupPostalCode} ${siteConfig.pickupCity}\n${siteConfig.pickupCountry}\n\nWe will confirm local pickup details by email.\n\nBest,\n${siteConfig.name}`
      : `Hi ${order.customerName},\n\nHere is an update about your order ${order.orderNumber}.\n\nBest,\n${siteConfig.name}`;

  return (
    <div className="max-w-6xl space-y-6">
      {emailStatus === "sent" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-success">
          Customer email sent successfully.
        </div>
      )}
      {emailStatus === "failed" && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-danger">
          The customer email could not be sent. Please try again.
        </div>
      )}
      {emailStatus === "missing" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-foreground">
          Add a message before sending the email.
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Admin order detail
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            Order {order.orderNumber}
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={`/api/admin/orders/${order.id}/invoice`} className="btn-secondary">
            Download invoice
          </a>
          <Link href="/admin/orders" className="btn-secondary">
            Back to orders
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
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
            <p className="text-xs leading-6 text-muted">
              Carrier tracking updates can also move shipping orders forward automatically, but you can still override the status here at any time.
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
                    : "Tracking sync is ready in code. Add SHIP24_API_KEY to enable automatic carrier updates, or use SEVENTEENTRACK_API_KEY / AFTERSHIP_API_KEY if you prefer those providers.")}
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
              {addressLines.join("\n")}
            </pre>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">Items in this order</h2>
              <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                {orderItems.reduce((sum, item) => sum + item.quantity, 0)} item
                {orderItems.reduce((sum, item) => sum + item.quantity, 0) === 1 ? "" : "s"}
              </span>
            </div>

            {orderItems.length > 0 ? (
              <div className="space-y-3">
                {orderItems.map((item) => {
                  const imageUrl = item.product.images[0]?.url ?? null;
                  const lineTotal = item.priceAtPurchaseCents * item.quantity;

                  return (
                    <div
                      key={item.id}
                      className="flex gap-3 rounded-[1rem] border border-border bg-background p-3"
                    >
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-[0.85rem] bg-[#ebe8e1]">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={`${item.product.artist} - ${item.product.title}`}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.16em] text-muted">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                            {item.product.artist}
                          </p>
                          <Link
                            href={`/products/${item.product.id}`}
                            className="block text-sm font-semibold leading-5 text-foreground hover:text-accent"
                          >
                            {item.product.title}
                          </Link>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs text-muted">
                          <span className="rounded-full border border-border px-2 py-1 uppercase tracking-[0.16em]">
                            {item.product.format}
                          </span>
                          <span>Qty: {item.quantity}</span>
                          <span>Unit: {formatEuroFromCents(item.priceAtPurchaseCents)}</span>
                          {item.product.conditionMedia && (
                            <span>Media: {item.product.conditionMedia}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                          Line total
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {formatEuroFromCents(lineTotal)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted">No order items saved for this order.</p>
            )}
          </div>

          <div className="card space-y-2">
            <div className="flex justify-between text-sm text-muted">
              <span>Subtotal</span>
              <span>{formatEuroFromCents(order.subtotalCents)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted">
              <span>Shipping</span>
              <span>{formatEuroFromCents(order.shippingCents)}</span>
            </div>
            {order.taxCents > 0 && (
              <div className="flex justify-between text-sm text-muted">
                <span>VAT</span>
                <span>{formatEuroFromCents(order.taxCents)}</span>
              </div>
            )}
            <div className="border-t border-border pt-2">
              <div className="flex justify-between text-lg font-bold text-foreground">
                <span>Total</span>
                <span>{formatEuroFromCents(order.totalCents)}</span>
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">Invoice VAT</h2>
              <a href={`/api/admin/orders/${order.id}/invoice`} className="btn-secondary">
                Download invoice
              </a>
            </div>

            <form
              action={updateOrderVat.bind(null, order.id)}
              className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
            >
              <div>
                <label htmlFor="vatRate" className="label">
                  VAT %
                </label>
                <input
                  id="vatRate"
                  name="vatRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="input"
                  defaultValue={vatRate > 0 ? vatRate.toFixed(1) : ""}
                  placeholder="0"
                />
              </div>
              <button type="submit" className="btn-primary">
                Save VAT
              </button>
            </form>

            <p className="text-xs leading-6 text-muted">
              Leave this empty or set it to 0 if the invoice should not show a VAT line.
            </p>
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

          <div className="card space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
            <h2 className="text-lg font-semibold text-foreground">Email customer</h2>
            <p className="mt-1 text-sm text-muted">
              Sends to {order.customerEmail} using the same branded email style as the other customer emails.
            </p>
          </div>
        </div>

        <form action={sendManualOrderEmail.bind(null, order.id)} className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div>
              <label htmlFor="sender" className="label">
                Send from
              </label>
              <select id="sender" name="sender" className="input" defaultValue="orders">
                <option value="orders">{siteConfig.orderEmail}</option>
                <option value="support">{siteConfig.supportEmail}</option>
              </select>
            </div>
            <div>
              <label htmlFor="subject" className="label">
                Subject
              </label>
              <input
                id="subject"
                name="subject"
                className="input"
                defaultValue={defaultManualSubject}
              />
            </div>
          </div>

          <div>
            <label htmlFor="message" className="label">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              rows={10}
              className="input min-h-[280px] w-full"
              defaultValue={defaultManualMessage}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="submit" className="btn-primary">
              Send email
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
