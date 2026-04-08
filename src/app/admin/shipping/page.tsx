import { asc } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { deleteShippingRate } from "@/actions/shipping";
import { db, schema } from "@/db";
import { requireAuthenticatedAdmin } from "@/lib/auth";
import { formatEuroFromCents } from "@/lib/money";
import { getCountryLabel } from "@/lib/shipping";
import { ShippingRateForm } from "./shipping-rate-form";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage() {
  await requireAuthenticatedAdmin();

  const rates = await db()
    .select()
    .from(schema.shippingRates)
    .orderBy(
      asc(schema.shippingRates.countryCode),
      asc(schema.shippingRates.formatScope),
      asc(schema.shippingRates.minQuantity)
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Shipping rules</h1>
        <p className="mt-2 text-sm text-muted">
          Stripe checkout will use these rules to price shipping by country, format, and quantity.
        </p>
      </div>

      <ShippingRateForm />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted">Country</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Format</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Quantity</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Rate</th>
              <th className="px-4 py-3 text-right font-medium text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((rate) => (
              <tr key={rate.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                <td className="px-4 py-3 text-foreground">
                  <div className="font-medium">{rate.countryCode}</div>
                  <div className="text-xs text-muted">{getCountryLabel(rate.countryCode)}</div>
                </td>
                <td className="px-4 py-3 capitalize text-foreground">{rate.formatScope}</td>
                <td className="px-4 py-3 text-foreground">
                  {rate.minQuantity}
                  {rate.maxQuantity !== null ? `-${rate.maxQuantity}` : "+"}
                </td>
                <td className="px-4 py-3 text-foreground">{formatEuroFromCents(rate.rateCents)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <form action={deleteShippingRate.bind(null, rate.id)}>
                      <button
                        type="submit"
                        title="Delete shipping rule"
                        className="text-muted transition-colors hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
