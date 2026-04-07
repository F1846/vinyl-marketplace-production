import { Suspense } from "react";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { schema } from "@/db";

export default function TrackOrderPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Track Your Order</h1>
        <p className="mt-2 text-muted">Enter your order number and the email you used at checkout.</p>
      </div>

      <form className="card space-y-4" onSubmit={async (e) => e.preventDefault()}>
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
          <input type="hidden" name="action" value="lookup" />
        </div>
        <button type="submit" className="btn-primary w-full">
          Track Order
        </button>

        <Suspense>
          <OrderResult />
        </Suspense>
      </form>
    </div>
  );
}

async function OrderResult() {
  // Client-side form or Server Action will populate this
  return null;
}
