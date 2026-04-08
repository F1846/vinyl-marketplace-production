"use client";

import { useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Package,
  Truck,
} from "lucide-react";
import { useDictionary } from "@/components/providers/locale-provider";
import { formatMessage } from "@/lib/i18n/format";
import { formatEuroFromCents } from "@/lib/money";
import type { TrackingSummary } from "@/types/order";

interface OrderData {
  orderNumber: string;
  status: string;
  paymentMethod: string;
  deliveryMethod: string;
  totalCents: number;
  createdAt: string;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  trackingSummary: TrackingSummary | null;
  items: Array<{
    title: string;
    format: string;
    quantity: number;
    priceAtPurchaseCents: number;
  }>;
}

export default function TrackOrderPage() {
  const dictionary = useDictionary();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setOrder(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const orderNumber = formData.get("orderNumber") as string;
    const email = formData.get("email") as string;

    setLoading(true);
    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, email }),
      });
      const json = await res.json();
      if (json.data) {
        setOrder(json.data);
      } else {
        setError(dictionary.trackOrder.empty);
      }
    } catch {
      setError(dictionary.trackOrder.lookupFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          {dictionary.trackOrder.orderStatus}
        </p>
        <h1 className="font-sans text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">
          {dictionary.trackOrder.title}
        </h1>
        <p className="mx-auto max-w-xl text-muted">
          {dictionary.trackOrder.titleBody}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label htmlFor="orderNumber" className="label">
            {dictionary.trackOrder.orderNumber}
          </label>
          <input
            id="orderNumber"
            name="orderNumber"
            className="input"
            placeholder={dictionary.trackOrder.placeholderOrder}
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="label">
            {dictionary.trackOrder.email}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            placeholder={dictionary.trackOrder.placeholderEmail}
            required
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? dictionary.trackOrder.lookupLoading : dictionary.trackOrder.trackOrder}
        </button>
      </form>

      {error && (
        <div className="card py-8 text-center">
          <p className="text-muted">{error}</p>
        </div>
      )}

      {order && <OrderResult order={order} />}
    </div>
  );
}

function OrderResult({ order }: { order: OrderData }) {
  const dictionary = useDictionary();
  const statusConfig = {
    pending: { icon: Clock, color: "text-yellow-500", label: dictionary.trackOrder.statusPending },
    processing: { icon: Package, color: "text-blue-500", label: dictionary.trackOrder.statusProcessing },
    shipped: { icon: Truck, color: "text-zinc-700", label: dictionary.trackOrder.statusShipped },
    delivered: { icon: CheckCircle, color: "text-green-600", label: dictionary.trackOrder.statusDelivered },
    cancelled: { icon: AlertCircle, color: "text-danger", label: dictionary.trackOrder.statusCancelled },
  };
  const status =
    statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      <div className="card space-y-6">
        <div className="flex items-center gap-3">
          <StatusIcon className={`h-8 w-8 ${status.color}`} />
          <div>
            <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
              {order.orderNumber}
            </h2>
            <p className={`text-sm font-medium ${status.color}`}>{status.label}</p>
          </div>
        </div>

        <div>
          <h3 className="mb-2 font-sans text-xl font-bold tracking-[-0.04em] text-foreground">
            {dictionary.trackOrder.items}
          </h3>
          <div className="space-y-2">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between gap-4 text-sm">
                <span className="text-foreground">
                  {item.title} ({item.format}) x{item.quantity}
                </span>
                <span className="text-muted">
                  {formatEuroFromCents(item.priceAtPurchaseCents * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <div className="flex justify-between text-lg font-bold text-foreground">
            <span>{dictionary.trackOrder.orderTotal}</span>
            <span>{formatEuroFromCents(order.totalCents)}</span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {formatMessage(dictionary.trackOrder.orderedOn, {
              date: new Date(order.createdAt).toLocaleDateString(),
            })}
          </p>
          <p className="text-xs text-muted">
            {formatMessage(dictionary.trackOrder.paymentDelivery, {
              payment: order.paymentMethod,
              delivery: order.deliveryMethod,
            })}
          </p>
        </div>
      </div>

      {(order.trackingSummary || order.trackingNumber) && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                {dictionary.trackOrder.trackingHeading}
              </p>
              <h3 className="mt-1 font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
                {order.trackingSummary?.carrierStatusLabel ?? dictionary.trackOrder.trackingActive}
              </h3>
            </div>
            {order.trackingSummary?.trackingUrl && (
              <a
                href={order.trackingSummary.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
              >
                {dictionary.trackOrder.openCarrierPage} <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>

          <div className="space-y-1 text-sm text-muted">
            <p>
              {(order.trackingSummary?.carrierName ??
                order.trackingSummary?.carrierSlug ??
                order.trackingCarrier ??
                "Carrier") +
                " / "}
              <code className="text-foreground">
                {order.trackingSummary?.trackingNumber ?? order.trackingNumber}
              </code>
            </p>
            {order.trackingSummary?.message && <p>{order.trackingSummary.message}</p>}
            {order.trackingSummary?.lastUpdatedAt && (
              <p>
                {formatMessage(dictionary.trackOrder.latestCarrierUpdate, {
                  date: new Date(order.trackingSummary.lastUpdatedAt).toLocaleString(),
                })}
              </p>
            )}
          </div>

          {order.trackingSummary?.checkpoints?.length ? (
            <div className="space-y-3">
              {order.trackingSummary.checkpoints.slice(0, 5).map((checkpoint, index) => (
                <div
                  key={`${checkpoint.timestamp ?? "checkpoint"}-${index}`}
                  className="rounded-[1rem] border border-border bg-background p-3"
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
          ) : (
            <p className="text-sm text-muted">
              {dictionary.trackOrder.trackingWaiting}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
