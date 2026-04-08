"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
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

interface OrderLookupParams {
  orderNumber: string;
  email: string;
}

const TRACKING_REFRESH_INTERVAL_MS = 60 * 1000;

async function requestOrderLookup(params: OrderLookupParams) {
  const res = await fetch("/api/orders/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(params),
  });

  const json = await res.json();
  return json.data as OrderData | null;
}

export default function TrackOrderPage() {
  const dictionary = useDictionary();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lookup, setLookup] = useState<OrderLookupParams | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  const lookupOrder = useCallback(
    async (params: OrderLookupParams, mode: "initial" | "refresh") => {
      if (mode === "initial") {
        setLoading(true);
        setError("");
        setOrder(null);
        setLastCheckedAt(null);
      } else {
        setRefreshing(true);
      }

      try {
        const data = await requestOrderLookup(params);
        if (data) {
          setLookup(params);
          setOrder(data);
          setLastCheckedAt(new Date().toISOString());
          if (mode === "initial") {
            setError("");
          }
        } else if (mode === "initial") {
          setError(dictionary.trackOrder.empty);
        }
      } catch {
        if (mode === "initial") {
          setError(dictionary.trackOrder.lookupFailed);
        }
      } finally {
        if (mode === "initial") {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [dictionary.trackOrder.empty, dictionary.trackOrder.lookupFailed]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const orderNumber = String(formData.get("orderNumber") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    await lookupOrder({ orderNumber, email }, "initial");
  }

  useEffect(() => {
    if (
      !lookup ||
      !order?.trackingNumber ||
      order.status === "cancelled" ||
      order.status === "delivered"
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void lookupOrder(lookup, "refresh");
    }, TRACKING_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [lookup, lookupOrder, order?.status, order?.trackingNumber]);

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

      {order && (
        <OrderResult
          order={order}
          lastCheckedAt={lastCheckedAt}
          refreshing={refreshing}
          onRefresh={
            lookup
              ? () => {
                  void lookupOrder(lookup, "refresh");
                }
              : null
          }
        />
      )}
    </div>
  );
}

function OrderResult({
  order,
  lastCheckedAt,
  refreshing,
  onRefresh,
}: {
  order: OrderData;
  lastCheckedAt: string | null;
  refreshing: boolean;
  onRefresh: (() => void) | null;
}) {
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
            <div className="flex flex-wrap items-center gap-3">
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing
                    ? dictionary.trackOrder.refreshingTracking
                    : dictionary.trackOrder.refreshTracking}
                </button>
              )}
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
            {lastCheckedAt && (
              <p>
                {formatMessage(dictionary.trackOrder.lastChecked, {
                  date: new Date(lastCheckedAt).toLocaleString(),
                })}
              </p>
            )}
            {order.status !== "cancelled" && order.status !== "delivered" && (
              <p>{dictionary.trackOrder.autoRefresh}</p>
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
