"use client";

import Image from "next/image";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  EyeOff,
  ExternalLink,
  RotateCcw,
  Search,
  Tag,
  Trash2,
  Upload,
} from "lucide-react";
import {
  archiveProduct,
  bulkUpdateProducts,
  bulkUpdateStock,
  deleteProduct,
  putItemOnSale,
  relistProduct,
} from "@/actions/products";
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
  pressingCatalogNumber: string | null;
  discogsReleaseId: number | null;
  imageUrl: string | null;
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

const PAGE_SIZE_OPTIONS = [100, 250, 500, 1000] as const;

function sumStockQuantity<T extends { stockQuantity: number }>(rows: T[]) {
  return rows.reduce((acc, row) => acc + Math.max(row.stockQuantity, 0), 0);
}

function ItemThumbnail({
  imageUrl,
  artist,
  title,
}: {
  imageUrl: string | null;
  artist: string;
  title: string;
}) {
  if (!imageUrl) {
    return (
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded border border-border bg-surface text-xs text-muted">
        —
      </div>
    );
  }
  return (
    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded border border-border bg-white">
      <Image
        src={imageUrl}
        alt={`${artist} - ${title}`}
        fill
        sizes="48px"
        className="object-contain"
        style={{ padding: "5%" }}
        unoptimized
      />
    </div>
  );
}

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

function PutOnSaleForm({ id, currentPriceCents }: { id: string; currentPriceCents: number }) {
  const [euros, setEuros] = useState(
    currentPriceCents > 0 ? (currentPriceCents / 100).toFixed(2) : ""
  );
  return (
    <form action={putItemOnSale} className="flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="priceCents" value={Math.round(Number(euros || "0") * 100)} />
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
        className="inline-flex items-center gap-1 rounded-[1rem] border border-border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:border-success hover:bg-emerald-50 hover:text-success"
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(100);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingStock, setPendingStock] = useState<Record<string, string>>({});
  const [savingStock, setSavingStock] = useState(false);
  const lastSelectedIndexRef = useRef<number | null>(null);
  const checkboxRefs = useRef<(HTMLInputElement | null)[]>([]);
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return [...items]
      .filter((item) => {
        if (statusFilter !== "all" && item.status !== statusFilter) return false;
        if (formatFilter !== "all" && item.format !== formatFilter) return false;
        if (!q) return true;
        return (
          item.artist.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.genre.toLowerCase().includes(q) ||
          (item.pressingLabel?.toLowerCase().includes(q) ?? false) ||
          (item.pressingCatalogNumber?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((left, right) => {
        if (sortKey === "stock") {
          const delta = left.stockQuantity - right.stockQuantity;
          if (delta !== 0) return sortDir === "asc" ? delta : -delta;
        }
        if (sortKey === "price") {
          const delta = left.priceCents - right.priceCents;
          return sortDir === "asc" ? delta : -delta;
        }
        if (sortKey === "status") {
          const delta = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
          if (delta !== 0) return sortDir === "asc" ? delta : -delta;
        }
        const delta = `${left.artist} ${left.title}`.localeCompare(`${right.artist} ${right.title}`);
        return sortDir === "asc" ? delta : -delta;
      });
  }, [deferredQuery, formatFilter, items, sortDir, sortKey, statusFilter]);

  useEffect(() => { setPage(1); lastSelectedIndexRef.current = null; }, [deferredQuery, formatFilter, pageSize, sortDir, sortKey, statusFilter]);
  useEffect(() => { lastSelectedIndexRef.current = null; }, [page]);

  const totalUnits = useMemo(() => sumStockQuantity(items), [items]);
  const statusCounts = useMemo(() => ({
    all: totalUnits,
    active: sumStockQuantity(items.filter((i) => i.status === "active")),
    sold_out: sumStockQuantity(items.filter((i) => i.status === "sold_out")),
    archived: sumStockQuantity(items.filter((i) => i.status === "archived")),
  }), [items, totalUnits]);
  const formatCounts = useMemo(() => ({
    all: totalUnits,
    vinyl: sumStockQuantity(items.filter((i) => i.format === "vinyl")),
    cassette: sumStockQuantity(items.filter((i) => i.format === "cassette")),
    cd: sumStockQuantity(items.filter((i) => i.format === "cd")),
  }), [items, totalUnits]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedFiltered = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [currentPage, filtered, pageSize]);

  const visibleIds = useMemo(() => paginatedFiltered.map((item) => item.id), [paginatedFiltered]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIdSet.has(id));
  const selectedItems = useMemo(() => items.filter((item) => selectedIdSet.has(item.id)), [items, selectedIdSet]);
  const selectedUnits = useMemo(() => sumStockQuantity(selectedItems), [selectedItems]);
  const filteredUnits = useMemo(() => sumStockQuantity(filtered), [filtered]);
  const selectedWithoutPriceCount = selectedItems.filter((item) => item.priceCents <= 0).length;

  const toggleItem = (itemId: string, index: number, checked: boolean, withRange: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (withRange && lastSelectedIndexRef.current !== null) {
        const start = Math.min(lastSelectedIndexRef.current, index);
        const end = Math.max(lastSelectedIndexRef.current, index);
        for (const id of paginatedFiltered.slice(start, end + 1).map((item) => item.id)) {
          checked ? next.add(id) : next.delete(id);
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
    const nextIds = paginatedFiltered.filter((item) => item.status === nextStatus).map((item) => item.id);
    setSelectedIds(nextIds);
    lastSelectedIndexRef.current = nextIds.length > 0 ? paginatedFiltered.length - 1 : null;
  };

  const toggleSort = (nextSortKey: InventorySortKey) => {
    if (sortKey === nextSortKey) { setSortDir((d) => (d === "asc" ? "desc" : "asc")); return; }
    setSortKey(nextSortKey);
    setSortDir(nextSortKey === "price" || nextSortKey === "stock" ? "desc" : "asc");
  };

  const renderSortHeader = (label: string, column: InventorySortKey) => {
    const isActive = sortKey === column;
    const Icon = isActive && sortDir === "asc" ? ArrowUp : ArrowDown;
    return (
      <button type="button" onClick={() => toggleSort(column)} className="inline-flex items-center gap-1.5 transition-colors hover:text-accent">
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5" />
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">
          Inventory ({totalUnits} items / {items.length} listings)
        </h1>
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
              placeholder="Search by artist, title, genre, label or cat#..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input pl-10"
              aria-label="Search inventory"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              { value: "all", label: `All (${formatCounts.all})` },
              { value: "vinyl", label: `Vinyl (${formatCounts.vinyl})` },
              { value: "cassette", label: `Cassette (${formatCounts.cassette})` },
              { value: "cd", label: `CD (${formatCounts.cd})` },
            ] as const).map((option) => (
              <button key={option.value} type="button" onClick={() => setFormatFilter(option.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${formatFilter === option.value ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted hover:border-foreground/20 hover:text-foreground"}`}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            { value: "all", label: `All (${statusCounts.all})` },
            { value: "active", label: `On Sale (${statusCounts.active})` },
            { value: "sold_out", label: `Sold Out (${statusCounts.sold_out})` },
            { value: "archived", label: `Not for Sale (${statusCounts.archived})` },
          ] as const).map((option) => (
            <button key={option.value} type="button" onClick={() => setStatusFilter(option.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${statusFilter === option.value ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted hover:border-foreground/20 hover:text-foreground"}`}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {query && (
        <p className="text-sm text-muted">
          {filteredUnits} item{filteredUnits === 1 ? "" : "s"} across {filtered.length} listing
          {filtered.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
        </p>
      )}

      {filtered.length > pageSize && (
        <div className="flex flex-wrap items-center justify-start gap-3 rounded-[1rem] border border-border bg-white px-4 py-3 shadow-card">
          <p className="text-sm text-muted">
            Showing {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} filtered listings
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="inventory-page-size"
              className="text-xs font-semibold uppercase tracking-[0.16em] text-muted"
            >
              Items per page
            </label>
            <select
              id="inventory-page-size"
              className="input min-w-[92px] px-3 py-2 text-sm"
              value={pageSize}
              onChange={(event) =>
                setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])
              }
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button type="button" className="btn-secondary text-sm" disabled={currentPage === 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>Previous</button>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Page {currentPage} / {totalPages}</span>
            <button type="button" className="btn-secondary text-sm" disabled={currentPage >= totalPages} onClick={() => setPage((v) => Math.min(totalPages, v + 1))}>Next</button>
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-[1.5rem] border border-border bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input id="inventory-select-all" type="checkbox" checked={allVisibleSelected} onChange={toggleAll}
              className="h-4 w-4 rounded border-border text-accent focus:ring-accent" />
            <label htmlFor="inventory-select-all" className="text-sm font-medium text-foreground">Select / deselect all</label>
            <span className="text-xs uppercase tracking-[0.16em] text-muted">
              {selectedUnits} items selected / {selectedIds.length} listing
              {selectedIds.length === 1 ? "" : "s"}
            </span>
          </div>
          <form action={bulkUpdateProducts} className="flex flex-wrap gap-2">
            <input type="hidden" name="returnTo" value="/admin/inventory" />
            {selectedIds.map((id) => <input key={id} type="hidden" name="selectedIds" value={id} />)}
            <button type="submit" name="intent" value="put-on-sale" className="btn-secondary text-sm" disabled={selectedIds.length === 0 || selectedWithoutPriceCount > 0}>Put on sale selected</button>
            <button type="submit" name="intent" value="hide" className="btn-secondary text-sm" disabled={selectedIds.length === 0}>Archive selected</button>
            <button type="submit" name="intent" value="delete" className="btn-secondary text-sm" disabled={selectedIds.length === 0}>Delete selected</button>
          </form>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => selectByStatus("active")} className="btn-secondary text-sm">Select on sale</button>
          <button type="button" onClick={() => selectByStatus("sold_out")} className="btn-secondary text-sm">Select sold out</button>
          <button type="button" onClick={() => selectByStatus("archived")} className="btn-secondary text-sm">Select not for sale</button>
          <button type="button" onClick={() => { setSelectedIds([]); lastSelectedIndexRef.current = null; }} className="btn-secondary text-sm">Clear selection</button>
        </div>
      </div>

      {selectedWithoutPriceCount > 0 && (
        <p className="text-sm text-danger">
          {selectedWithoutPriceCount} selected item{selectedWithoutPriceCount === 1 ? " has" : "s have"} no saved price. Set a price first.
        </p>
      )}

      {Object.keys(pendingStock).length > 0 && (
        <div className="flex items-center gap-3 rounded-[1rem] border border-accent/30 bg-accent/5 px-4 py-3">
          <p className="flex-1 text-sm text-foreground">
            <span className="font-semibold">{Object.keys(pendingStock).length}</span> unsaved stock change{Object.keys(pendingStock).length === 1 ? "" : "s"}
          </p>
          <button type="button" disabled={savingStock}
            onClick={async () => {
              setSavingStock(true);
              await bulkUpdateStock(Object.entries(pendingStock).map(([id, val]) => ({ id, stockQuantity: Math.max(0, Math.round(Number(val) || 0)) })));
              setPendingStock({});
              setSavingStock(false);
            }}
            className="btn-primary text-sm">{savingStock ? "Saving..." : "Save all changes"}</button>
          <button type="button" onClick={() => setPendingStock({})} className="btn-secondary text-sm">Discard</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-hover">
            <tr>
              <th className="w-6 pl-2 pr-1 py-3 text-left font-medium text-foreground"><span className="sr-only">Select</span></th>
              <th className="min-w-[320px] pl-1 pr-4 py-3 text-left font-medium text-foreground">Item</th>
              <th className="hidden px-4 py-3 text-left font-medium text-foreground sm:table-cell">Format</th>
              <th className="hidden px-4 py-3 text-left font-medium text-foreground md:table-cell">{renderSortHeader("Price", "price")}</th>
              <th className="hidden px-4 py-3 text-left font-medium text-foreground md:table-cell">{renderSortHeader("Stock", "stock")}</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">{renderSortHeader("Status", "status")}</th>
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
              paginatedFiltered.map((item, index) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="pl-2 pr-1 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIdSet.has(item.id)}
                      ref={(element) => { checkboxRefs.current[index] = element; }}
                      onChange={(event) => toggleItem(item.id, index, event.currentTarget.checked, Boolean((event.nativeEvent as MouseEvent | undefined)?.shiftKey))}
                      onKeyDown={(event) => {
                        if (event.shiftKey && event.key === "ArrowDown" && index < filtered.length - 1) {
                          event.preventDefault();
                          if (!selectedIdSet.has(item.id)) toggleItem(item.id, index, true, false);
                          const nextIndex = index + 1;
                          toggleItem(paginatedFiltered[nextIndex].id, nextIndex, true, false);
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
                  <td className="pl-1 pr-4 py-3">
                    <div className="flex items-start gap-3">
                      <ItemThumbnail imageUrl={item.imageUrl} artist={item.artist} title={item.title} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground">
                          {item.discogsReleaseId ? (
                            <a
                              href={`https://www.discogs.com/release/${item.discogsReleaseId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 hover:text-accent hover:underline"
                            >
                              {item.artist} \u2014 {item.title}
                              <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted" />
                            </a>
                          ) : (
                            <span>{item.artist} \u2014 {item.title}</span>
                          )}
                        </div>
                        {(item.pressingLabel || item.pressingCatalogNumber || item.pressingYear) && (
                          <div className="mt-0.5 text-xs text-muted">
                            {[item.pressingLabel, item.pressingCatalogNumber, item.pressingYear].filter(Boolean).join(" \u00b7 ")}
                          </div>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-2 sm:hidden">
                          <span className={`badge badge-${item.format}`}>{item.format}</span>
                          <span className="text-xs text-muted">{formatEuroFromCents(item.priceCents)}</span>
                          <input type="number" min="0" step="1"
                            value={pendingStock[item.id] ?? item.stockQuantity}
                            onChange={(e) => setPendingStock((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            className="h-8 w-20 rounded-full border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                            aria-label="Stock quantity" />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className={`badge badge-${item.format}`}>{item.format}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-foreground md:table-cell">
                    {formatEuroFromCents(item.priceCents)}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <input type="number" min="0" step="1"
                      value={pendingStock[item.id] ?? item.stockQuantity}
                      onChange={(e) => setPendingStock((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      className="h-9 w-20 rounded-full border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                      aria-label="Stock quantity" />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} id={item.id} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Link href={`/admin/products/${item.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:border-accent hover:text-accent">
                        Edit
                      </Link>
                      {item.status === "archived" ? (
                        <PutOnSaleForm id={item.id} currentPriceCents={item.priceCents} />
                      ) : item.status === "sold_out" ? (
                        <form action={relistProduct.bind(null, item.id)}>
                          <button type="submit" title="Relist and put back on sale"
                            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:border-success hover:text-success">
                            <RotateCcw className="h-3 w-3" />
                            Relist
                          </button>
                        </form>
                      ) : (
                        <form action={archiveProduct.bind(null, item.id)}>
                          <button type="submit" title="Remove from sale"
                            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:border-amber-500 hover:text-amber-600">
                            <EyeOff className="h-3 w-3" />
                            Remove
                          </button>
                        </form>
                      )}
                      <form action={deleteProduct.bind(null, item.id)}>
                        <button type="submit" title="Delete from inventory"
                          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:border-danger hover:text-danger">
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
