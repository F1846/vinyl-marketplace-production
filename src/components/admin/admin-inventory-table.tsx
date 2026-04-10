"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, RotateCcw, EyeOff, Trash2, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { archiveProduct, deleteProduct, relistProduct } from "@/actions/products";
import type { MediaCondition, ProductFormat, ProductStatus } from "@/types/product";
import { formatEuroFromCents } from "@/lib/money";
import { ImportCatalogForm } from "@/app/admin/import/import-catalog-form";

export type InventoryRow = {
  id: string;
  artist: string;
  title: string;
  format: ProductFormat;
  genre: string;
  priceCents: number;
  stockQuantity: number;
  status: ProductStatus;
  conditionMedia: MediaCondition | null;
  pressingLabel: string | null;
  pressingYear: number | null;
};

type Props = {
  items: InventoryRow[];
};

function StatusBadge({ status }: { status: ProductStatus }) {
  if (status === "active") {
    return <span className="badge bg-emerald-100 text-emerald-800">On Sale</span>;
  }
  if (status === "sold_out") {
    return <span className="badge bg-orange-100 text-orange-700">Sold Out</span>;
  }
  return <span className="badge bg-zinc-100 text-zinc-500">Not for Sale</span>;
}

export function AdminInventoryTable({ items }: Props) {
  const [query, setQuery] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | ProductStatus>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.artist.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.genre.toLowerCase().includes(q) ||
        (item.pressingLabel?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [items, query, statusFilter]);

  const activeCount = items.filter((i) => i.status === "active").length;
  const soldOutCount = items.filter((i) => i.status === "sold_out").length;
  const archivedCount = items.filter((i) => i.status === "archived").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Inventory ({items.length})
          </h1>
          <p className="mt-1 text-sm text-muted">
            Your full collection — admin only, not visible to customers.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowImport((v) => !v)}
          className="btn-secondary flex items-center gap-2 text-sm"
          aria-expanded={showImport}
        >
          <Upload className="h-4 w-4" />
          {showImport ? "Hide CSV import" : "Bulk import CSV"}
          {showImport ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Inline CSV import */}
      {showImport && (
        <div className="card">
          <ImportCatalogForm />
        </div>
      )}

      {/* Search + filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="search"
            placeholder="Search by artist, title, genre or label…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input pl-10"
            aria-label="Search inventory"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "all", label: `All (${items.length})` },
              { value: "active", label: `On Sale (${activeCount})` },
              { value: "sold_out", label: `Sold Out (${soldOutCount})` },
              { value: "archived", label: `Not for Sale (${archivedCount})` },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                statusFilter === opt.value
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-surface text-muted hover:border-foreground/20 hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count when searching */}
      {query && (
        <p className="text-sm text-muted">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
        </p>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-hover">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-foreground">Item</th>
              <th className="hidden px-4 py-3 text-left font-medium text-foreground sm:table-cell">
                Format
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-foreground md:table-cell">
                Price
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-foreground md:table-cell">
                Stock
              </th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                  {query ? "No items match your search." : "No items in inventory."}
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-0 hover:bg-surface-hover"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {item.artist} &ndash; {item.title}
                    </div>
                    {(item.pressingLabel || item.pressingYear) && (
                      <div className="mt-0.5 text-xs text-muted">
                        {[item.pressingLabel, item.pressingYear].filter(Boolean).join(" · ")}
                      </div>
                    )}
                    {/* Show format/price on mobile */}
                    <div className="mt-1 flex flex-wrap items-center gap-2 sm:hidden">
                      <span className={`badge badge-${item.format}`}>{item.format}</span>
                      <span className="text-xs text-muted">{formatEuroFromCents(item.priceCents)}</span>
                      <span className="text-xs text-muted">Qty: {item.stockQuantity}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className={`badge badge-${item.format}`}>{item.format}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-foreground md:table-cell">
                    {formatEuroFromCents(item.priceCents)}
                  </td>
                  <td className="hidden px-4 py-3 text-foreground md:table-cell">
                    {item.stockQuantity}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Link
                        href={`/admin/products/${item.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:border-accent hover:text-accent"
                      >
                        Edit
                      </Link>
                      {item.status !== "active" ? (
                        <form action={relistProduct.bind(null, item.id)}>
                          <button
                            type="submit"
                            title="Put on sale (set to active)"
                            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:border-success hover:text-success"
                          >
                            <RotateCcw className="h-3 w-3" />
                            On Sale
                          </button>
                        </form>
                      ) : (
                        <form action={archiveProduct.bind(null, item.id)}>
                          <button
                            type="submit"
                            title="Remove from sale (archive)"
                            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:border-amber-500 hover:text-amber-600"
                          >
                            <EyeOff className="h-3 w-3" />
                            Not for Sale
                          </button>
                        </form>
                      )}
                      <form action={deleteProduct.bind(null, item.id)}>
                        <button
                          type="submit"
                          title="Permanently delete from inventory"
                          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:border-danger hover:text-danger"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
