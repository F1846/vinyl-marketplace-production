"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  EyeOff,
  RotateCcw,
  Search,
  Tag,
  Trash2,
  Upload,
} from "lucide-react";
import {
  archiveProduct,
  bulkUpdateProducts,
  deleteProduct,
  putItemOnSale,
  relistProduct,
} from "@/actions/products";
import { AdminStockForm } from "@/components/admin/admin-stock-form";
import type { MediaCondition, ProductFormat, ProductStatus } from "@/types/product";
import { formatEuroFromCents } from "@/lib/money";

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

type InventorySortKey = "stock" | "price" | "status";
type InventorySortDirection = "asc" | "desc";

const STATUS_ORDER: Record<ProductStatus, number> = {
  active: 0,
  sold_out: 1,
  archived: 2,
};

function StatusBadge({ status, id }: { status: ProductStatus; id: string }) {
  if (status === "active") {
    return (
      <Link
        href={`/products/${id}`}
        target="_blank"
        className="badge bg-emerald-100 text-emerald-800 hover:underline"
        title="View public listing"
      >
        On Sale
      </Link>
    );
  }

  if (status === "sold_out") {
    return <span className="badge bg-orange-100 text-orange-700">Sold Out</span>;
  }

  return <span className="badge bg-zinc-100 text-zinc-500">Not for Sale</span>;
}

function PutOnSaleForm({
  id,
  currentPriceCents,
}: {
  id: string;
  currentPriceCents: number;
}) {
  const [euros, setEuros] = useState(
    currentPriceCents > 0 ? (currentPriceCents / 100).toFixed(2) : ""
  );

  return (
    <form action={putItemOnSale} className="flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <input
        type="hidden"
        name="priceCents"
        value={Math.round(Number(euros || "0") * 100)}
      />
      <div className="flex items-center">
        <span className="rounded-l-md border border-r-0 border-border bg-surface px-2 py-1 text-xs text-muted">
          EUR
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={euros}
          onChange={(event) => setEuros(event.target.value)}
          placeholder="0.00"
          className="w-20 rounded-none border border-border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
          aria-label="Sale price in euros"
        />
      </div>
      <button
        type="submit"
        title="Set price and put on sale"
        className="inline-flex items-center gap-1 rounded-r-md border border-border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:border-success hover:bg-emerald-50 hover:text-success"
      >
        <Tag className="h-3 w-3" />
        Put on Sale
      </button>
    </form>
  );
}

export function AdminInventoryTable({ items }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductStatus>("all");
  const [formatFilter, setFormatFilter] = useState<"all" | ProductFormat>("all");
  const [sortKey, setSortKey] = useState<InventorySortKey>("stock");
  const [sortDir, setSortDir] = useState<InventorySortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const lastSelectedIndexRef = useRef<number | null>(null);
  const checkboxRefs = useRef<(HTMLInputElement | null)[]>([]);
  const returnTo = "/admin/inventory";

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...items]
      .filter((item) => {
        if (statusFilter !== "all" && item.status !== statusFilter) {
          return false;
        }

        if (formatFilter !== "all" && item.format !== formatFilter) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return (
          item.artist.toLowerCase().includes(normalizedQuery) ||
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.genre.toLowerCase().includes(normalizedQuery) ||
          (item.pressingLabel?.toLowerCase().includes(normalizedQuery) ?? false)
        );
      })
      .sort((left, right) => {
        if (sortKey === "stock") {
          const delta = left.stockQuantity - right.stockQuantity;
          if (delta !== 0) {
            return sortDir === "asc" ? delta : -delta;
          }
        }

        if (sortKey === "price") {
          const delta = left.priceCents - right.priceCents;
          return sortDir === "asc" ? delta : -delta;
        }

        if (sortKey === "status") {
          const delta = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
          if (delta !== 0) {
            return sortDir === "asc" ? delta : -delta;
          }
        }

        const delta = `${left.artist} ${left.title}`.localeCompare(
          `${right.artist} ${right.title}`
        );
        return sortDir === "asc" ? delta : -delta;
      });
  }, [formatFilter, items, query, sortDir, sortKey, statusFilter]);

  const statusCounts = useMemo(
    () => ({
      all: items.length,
      active: items.filter((item) => item.status === "active").length,
      sold_out: items.filter((item) => item.status === "sold_out").length,
      archived: items.filter((item) => item.status === "archived").length,
    }),
    [items]
  );

  const formatCounts = useMemo(
    () => ({
      all: items.length,
      vinyl: items.filter((item) => item.format === "vinyl").length,
      cassette: items.filter((item) => item.format === "cassette").length,
      cd: items.filter((item) => item.format === "cd").length,
    }),
    [items]
  );

  const visibleIds = useMemo(() => filtered.map((item) => item.id), [filtered]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIdSet.has(id));
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIdSet.has(item.id)),
    [items, selectedIdSet]
  );
  const selectedWithoutPriceCount = selectedItems.filter(
    (item) => item.priceCents <= 0
  ).length;

  const toggleItem = (
    itemId: string,
    index: number,
    checked: boolean,
    withRange: boolean
  ) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (withRange && lastSelectedIndexRef.current !== null) {
        const start = Math.min(lastSelectedIndexRef.current, index);
        const end = Math.max(lastSelectedIndexRef.current, index);
        const rangeIds = filtered.slice(start, end + 1).map((item) => item.id);

        for (const id of rangeIds) {
          if (checked) {
            next.add(id);
          } else {
            next.delete(id);
          }
        }
      } else if (checked) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }

      return Array.from(next);
    });

    lastSelectedIndexRef.current = index;
  };

  const toggleAll = () => {
    setSelectedIds(allVisibleSelected ? [] : visibleIds);
    lastSelectedIndexRef.current = allVisibleSelected ? null : visibleIds.length - 1;
  };

  const selectByStatus = (nextStatus: ProductStatus) => {
    const nextIds = filtered
      .filter((item) => item.status === nextStatus)
      .map((item) => item.id);
    setSelectedIds(nextIds);
    lastSelectedIndexRef.current = nextIds.length > 0 ? filtered.length - 1 : null;
  };

  const toggleSort = (nextSortKey: InventorySortKey) => {
    if (sortKey === nextSortKey) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDir(nextSortKey === "price" || nextSortKey === "stock" ? "desc" : "asc");
  };

  const renderSortHeader = (label: string, column: InventorySortKey) => {
    const isActive = sortKey === column;
    const Icon = isActive && sortDir === "asc" ? ArrowUp : ArrowDown;

    return (
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
      >
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5" />
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Inventory ({items.length})</h1>
        </div>
        <Link href="/admin/import" className="btn-secondary flex items-center gap-2 text-sm">
          <Upload className="h-4 w-4" />
          CSV import
        </Link>
      </div>

      <div className="space-y-3 rounded-[1.5rem] border border-border bg-white p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              placeholder="Search by artist, title, genre or label..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input pl-10"
              aria-label="Search inventory"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { value: "all", label: `All (${formatCounts.all})` },
                { value: "vinyl", label: `Vinyl (${formatCounts.vinyl})` },
                { value: "cassette", label: `Cassette (${formatCounts.cassette})` },
                { value: "cd", label: `CD (${formatCounts.cd})` },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormatFilter(option.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                  formatFilter === option.value
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-surface text-muted hover:border-foreground/20 hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "all", label: `All (${statusCounts.all})` },
              { value: "active", label: `On Sale (${statusCounts.active})` },
              { value: "sold_out", label: `Sold Out (${statusCounts.sold_out})` },
              { value: "archived", label: `Not for Sale (${statusCounts.archived})` },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                statusFilter === option.value
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-surface text-muted hover:border-foreground/20 hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

      </div>

      {query && (
        <p className="text-sm text-muted">
          {filtered.length} result{filtered.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
        </p>
      )}

      <div className="space-y-3 rounded-[1.5rem] border border-border bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input
              id="inventory-select-all"
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
            />
            <label htmlFor="inventory-select-all" className="text-sm font-medium text-foreground">
              Select / deselect all
            </label>
            <span className="text-xs uppercase tracking-[0.16em] text-muted">
              {selectedIds.length} selected
            </span>
          </div>

          <form action={bulkUpdateProducts} className="flex flex-wrap gap-2">
            <input type="hidden" name="returnTo" value="/admin/inventory" />
            {selectedIds.map((id) => (
              <input key={id} type="hidden" name="selectedIds" value={id} />
            ))}
            <button
              type="submit"
              name="intent"
              value="put-on-sale"
              className="btn-secondary text-sm"
              disabled={selectedIds.length === 0 || selectedWithoutPriceCount > 0}
              title="Uses the saved prices for the selected items"
            >
              Put on sale selected
            </button>
            <button
              type="submit"
              name="intent"
              value="hide"
              className="btn-secondary text-sm"
              disabled={selectedIds.length === 0}
            >
              Archive selected
            </button>
            <button
              type="submit"
              name="intent"
              value="delete"
              className="btn-secondary text-sm"
              disabled={selectedIds.length === 0}
            >
              Delete selected
            </button>
          </form>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => selectByStatus("active")}
            className="btn-secondary text-sm"
          >
            Select on sale
          </button>
          <button
            type="button"
            onClick={() => selectByStatus("sold_out")}
            className="btn-secondary text-sm"
          >
            Select sold out
          </button>
          <button
            type="button"
            onClick={() => selectByStatus("archived")}
            className="btn-secondary text-sm"
          >
            Select not for sale
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedIds([]);
              lastSelectedIndexRef.current = null;
            }}
            className="btn-secondary text-sm"
          >
            Clear selection
          </button>
        </div>
      </div>

      {selectedWithoutPriceCount > 0 && (
        <p className="text-sm text-danger">
          {selectedWithoutPriceCount} selected item
          {selectedWithoutPriceCount === 1 ? " has" : "s have"} no saved price.
          Set a price first before using the bulk on-sale action.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-hover">
            <tr>
              <th className="w-10 px-4 py-3 text-left font-medium text-foreground">
                <span className="sr-only">Select</span>
              </th>
              <th className="px-4 py-3 text-left font-medium text-foreground">
                Item
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-foreground sm:table-cell">
                Format
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-foreground md:table-cell">
                {renderSortHeader("Price", "price")}
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-foreground md:table-cell">
                {renderSortHeader("Stock", "stock")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-foreground">
                {renderSortHeader("Status", "status")}
              </th>
              <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                  {query ? "No items match your search." : "No items in inventory."}
                </td>
              </tr>
            ) : (
              filtered.map((item, index) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-0 hover:bg-surface-hover"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIdSet.has(item.id)}
                      ref={(element) => {
                        checkboxRefs.current[index] = element;
                      }}
                      onChange={(event) =>
                        toggleItem(
                          item.id,
                          index,
                          event.currentTarget.checked,
                          Boolean((event.nativeEvent as MouseEvent | undefined)?.shiftKey)
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.shiftKey &&
                          event.key === "ArrowDown" &&
                          index < filtered.length - 1
                        ) {
                          event.preventDefault();
                          if (!selectedIdSet.has(item.id)) {
                            toggleItem(item.id, index, true, false);
                          }
                          const nextIndex = index + 1;
                          toggleItem(filtered[nextIndex].id, nextIndex, true, false);
                          checkboxRefs.current[nextIndex]?.focus();
                        }

                        if (event.shiftKey && event.key === "ArrowUp" && index > 0) {
                          event.preventDefault();
                          toggleItem(item.id, index, false, false);
                          checkboxRefs.current[index - 1]?.focus();
                        }
                      }}
                      className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                      aria-label={`Select ${item.artist} - ${item.title}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {item.artist} - {item.title}
                    </div>
                    {(item.pressingLabel || item.pressingYear) && (
                      <div className="mt-0.5 text-xs text-muted">
                        {[item.pressingLabel, item.pressingYear].filter(Boolean).join(" | ")}
                      </div>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2 sm:hidden">
                      <span className={`badge badge-${item.format}`}>{item.format}</span>
                      <span className="text-xs text-muted">
                        {formatEuroFromCents(item.priceCents)}
                      </span>
                      <div className="w-full">
                        <AdminStockForm
                          id={item.id}
                          stockQuantity={item.stockQuantity}
                          returnTo={returnTo}
                          compact
                        />
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className={`badge badge-${item.format}`}>{item.format}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-foreground md:table-cell">
                    {formatEuroFromCents(item.priceCents)}
                  </td>
                  <td className="hidden px-4 py-3 text-foreground md:table-cell">
                    <AdminStockForm
                      id={item.id}
                      stockQuantity={item.stockQuantity}
                      returnTo={returnTo}
                      compact
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} id={item.id} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Link
                        href={`/admin/products/${item.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:border-accent hover:text-accent"
                      >
                        Edit
                      </Link>
                      {item.status === "archived" ? (
                        <PutOnSaleForm id={item.id} currentPriceCents={item.priceCents} />
                      ) : item.status === "sold_out" ? (
                        <form action={relistProduct.bind(null, item.id)}>
                          <button
                            type="submit"
                            title="Relist and put back on sale"
                            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:border-success hover:text-success"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Relist
                          </button>
                        </form>
                      ) : (
                        <form action={archiveProduct.bind(null, item.id)}>
                          <button
                            type="submit"
                            title="Remove from sale"
                            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:border-amber-500 hover:text-amber-600"
                          >
                            <EyeOff className="h-3 w-3" />
                            Remove
                          </button>
                        </form>
                      )}
                      <form action={deleteProduct.bind(null, item.id)}>
                        <button
                          type="submit"
                          title="Delete from inventory"
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
