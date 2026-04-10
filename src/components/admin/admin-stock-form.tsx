"use client";

import { useState } from "react";
import { PackageCheck } from "lucide-react";
import { updateProductStock } from "@/actions/products";

type AdminStockFormProps = {
  id: string;
  stockQuantity: number;
  returnTo: string;
  compact?: boolean;
};

export function AdminStockForm({
  id,
  stockQuantity,
  returnTo,
  compact = false,
}: AdminStockFormProps) {
  const [value, setValue] = useState(String(stockQuantity));

  return (
    <form action={updateProductStock} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input
        type="number"
        min="0"
        step="1"
        name="stockQuantity"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className={`rounded-full border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent ${
          compact ? "h-9 w-20" : "h-10 w-24"
        }`}
        aria-label="Stock quantity"
      />
      <button
        type="submit"
        className={`inline-flex items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:border-accent hover:text-accent ${
          compact ? "h-9" : "h-10"
        }`}
      >
        <PackageCheck className="h-3.5 w-3.5" />
        Save
      </button>
    </form>
  );
}
