"use client";

import { useActionState } from "react";
import { createShippingRateAction } from "@/actions/shipping";

export function ShippingRateForm() {
  const [state, formAction] = useActionState(createShippingRateAction, {
    error: null,
    success: false,
  });

  return (
    <form action={formAction} className="card space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Add shipping rule</h2>
          <p className="text-sm text-muted">
            Rules are matched by country, quantity bracket, and format.
          </p>
        </div>
        {state.success && <p className="text-sm text-success">Rate saved.</p>}
      </div>

      {state.error && (
        <div className="rounded-md border border-red-900/50 bg-red-900/20 p-3 text-sm text-danger">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div>
          <label htmlFor="countryCode" className="label">Country</label>
          <input
            id="countryCode"
            name="countryCode"
            className="input uppercase"
            placeholder="DE"
            defaultValue="DE"
            maxLength={3}
            required
          />
          <p className="mt-1 text-xs text-muted">Use `ALL` as a fallback rule.</p>
        </div>

        <div>
          <label htmlFor="formatScope" className="label">Format</label>
          <select id="formatScope" name="formatScope" className="input" defaultValue="vinyl">
            <option value="all">All formats</option>
            <option value="vinyl">Vinyl</option>
            <option value="cassette">Cassette</option>
            <option value="cd">CD</option>
          </select>
        </div>

        <div>
          <label htmlFor="minQuantity" className="label">Min qty</label>
          <input
            id="minQuantity"
            name="minQuantity"
            type="number"
            min={1}
            className="input"
            defaultValue={1}
            required
          />
        </div>

        <div>
          <label htmlFor="maxQuantity" className="label">Max qty</label>
          <input
            id="maxQuantity"
            name="maxQuantity"
            type="number"
            min={1}
            className="input"
            placeholder="Blank = no cap"
          />
        </div>

        <div>
          <label htmlFor="rateCents" className="label">Rate (euro cents)</label>
          <input
            id="rateCents"
            name="rateCents"
            type="number"
            min={0}
            className="input"
            placeholder="799"
            required
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary">Save shipping rule</button>
      </div>
    </form>
  );
}
