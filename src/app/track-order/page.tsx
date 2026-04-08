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

const STATUS_CONFIG = {
  pending: { icon: Clock, color: "text-yellow-500", label: "Order placed" },
  processing: { icon: Package, color: "text-blue-500", label: "Processing" },
  shipped: { icon: Truck, color: "text-zinc-700", label: "Shipped" },
  delivered: { icon: CheckCircle, color: "text-green-600", label: "Delivered" },
  cancelled: { icon: AlertCircle, color: "text-danger", label: "Cancelled" },
};

export default function TrackOrderPage() {
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
        setError("If you have a recent order, you will see its status here.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Order status
        </p>
      <h1 className="font-sans text-[1.85rem] font-bold tracking-[-0.04em] text-foreground sm:text-[2.15rem]">
          Track your order
        </h1>
        <p className="mx-auto max-w-xl text-muted">
          Enter your order number and the email you used at checkout.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label htmlFor="orderNumber" className="label">
            Order number
          </label>
          <input
            id="orderNumber"
            name="orderNumber"
            className="input"
            placeholder="e.g. FS-20260408-A7K2"
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="label">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            placeholder="your@email.com"
            required
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Looking up..." : "Track order"}
        </button>
      </form>

      {error && (
          <div className="card py-6 text-center">
          <p className="text-muted">{error}</p>
        </div>
      )}

      {order && <OrderResult order={order} />}
    </div>
  );
}

function OrderResult({ order }: { order: OrderData }) {
  const status =
    STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
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
            Items
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
            <span>Order total</span>
            <span>{formatEuroFromCents(order.totalCents)}</span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Ordered: {new Date(order.createdAt).toLocaleDateString()}
          </p>
          <p className="text-xs text-muted">
            Payment: {order.paymentMethod} / Delivery: {order.deliveryMethod}
          </p>
        </div>
      </div>

      {(order.trackingSummary || order.trackingNumber) && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Shipment tracking
              </p>
              <h3 className="mt-1 font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
                {order.trackingSummary?.carrierStatusLabel ?? "Tracking active"}
              </h3>
            </div>
            {order.trackingSummary?.trackingUrl && (
              <a
                href={order.trackingSummary.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
              >
                Open carrier page <ExternalLink className="h-4 w-4" />
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
                Latest carrier update:{" "}
                {new Date(order.trackingSummary.lastUpdatedAt).toLocaleString()}
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
              We are waiting for the carrier to publish the first shipment scan.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
