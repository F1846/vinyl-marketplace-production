"use client";

import { useState, FormEvent } from "react";
import { Package, Truck, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { formatEuroFromCents } from "@/lib/money";

interface OrderData {
  orderNumber: string;
  status: string;
  totalCents: number;
  createdAt: string;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  items: Array<{
    title: string;
    format: string;
    quantity: number;
    priceAtPurchaseCents: number;
  }>;
}

const STATUS_CONFIG = {
  pending: { icon: Clock, color: "text-yellow-400", label: "Order Placed" },
  processing: { icon: Package, color: "text-blue-400", label: "Processing" },
  shipped: { icon: Truck, color: "text-purple-400", label: "Shipped" },
  delivered: { icon: CheckCircle, color: "text-green-400", label: "Delivered" },
  cancelled: { icon: AlertCircle, color: "text-danger", label: "Cancelled" },
};

export default function TrackOrderPage() {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setOrder(null);

    const form = e.currentTarget;
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
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Track Your Order</h1>
        <p className="mt-2 text-muted">
          Enter your order number and the email you used at checkout.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label htmlFor="orderNumber" className="label">Order Number</label>
          <input
            id="orderNumber"
            name="orderNumber"
            className="input"
            placeholder="e.g. VM-20260407-0001"
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="label">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            placeholder="your@email.com"
            required
          />
        </div>
        <button
          type="submit"
          className="btn-primary w-full"
          disabled={loading}
        >
          {loading ? "Looking up..." : "Track Order"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="card text-center py-8">
          <p className="text-muted">{error}</p>
        </div>
      )}

      {/* Order result */}
      {order && <OrderResult order={order} />}
    </div>
  );
}

function OrderResult({ order }: { order: OrderData }) {
  const status = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;

  return (
    <div className="card space-y-6">
      <div className="flex items-center gap-3">
        <StatusIcon className={`h-8 w-8 ${status.color}`} />
        <div>
          <h2 className="text-lg font-bold text-foreground">{order.orderNumber}</h2>
          <p className={`text-sm font-medium capitalize ${status.color}`}>{order.status}</p>
        </div>
      </div>

      {/* Items */}
      <div>
        <h3 className="text-sm font-semibold text-muted mb-2">Items</h3>
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-foreground">
                {item.title} ({item.format}) x{item.quantity}
              </span>
              <span className="text-muted">{formatEuroFromCents(item.priceAtPurchaseCents * item.quantity)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="border-t border-border pt-3">
        <div className="flex justify-between text-lg font-bold text-foreground">
          <span>Total Paid</span>
          <span>{formatEuroFromCents(order.totalCents)}</span>
        </div>
        <p className="text-xs text-muted mt-1">
          Ordered: {new Date(order.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Tracking */}
      {order.status === "shipped" && order.trackingNumber && (
        <div className="border-t border-border pt-3">
          <h3 className="text-sm font-semibold text-muted mb-1">Tracking</h3>
          <p className="text-sm text-foreground">
            {order.trackingCarrier}: <code className="text-accent">{order.trackingNumber}</code>
          </p>
        </div>
      )}
    </div>
  );
}
