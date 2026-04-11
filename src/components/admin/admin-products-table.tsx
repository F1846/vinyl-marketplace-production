"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
// checkboxRefs is populated per-row to support Shift+ArrowDown keyboard range selection
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  EyeOff,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import {
  archiveProduct,
  bulkUpdateProducts,
  deleteProduct,
  relistProduct,
} from "@/actions/products";
import { AdminStockForm } from "@/components/admin/admin-stock-form";
import type { ProductFormat, ProductStatus } from "@/types/product";
import { formatEuroFromCents } from "@/lib/money";

type SortKey = "created" | "price" | "stock" | "status";
type SortDirection = "asc" | "desc";

type AdminProductRow = {
  id: string;
  artist: string;
  title: string;
  format: ProductFormat;
  priceCents: number;
  stockQuantity: number;
  status: ProductStatus;
  imageUrl: string | null;
  pressingLabel: string | null;
  pressingCatalogNumber: string | null;
  pressingYear: number | null;
  discogsReleaseId: number | null;
};

type Props = {
  products: AdminProductRow[];
  productCountLabel: number;
  sort: SortKey;
  dir: SortDirection;
  updated?: string;
};

function statusBadge(status: ProductStatus, id: string) {
  if (status === "active") {
    return (
      <Link
        href={`/products/${id}`}
        target="_blank"
        className="badge-active hover:underline"
        title="View public listing"
      >
        active ↗
      </Link>
    );
  }
  const cls = { sold_out: "badge-sold", archived: "badge-archived" }[
    status as "sold_out" | "archived"
  ];
  return <span className={cls}>{status}</span>;
}

export function AdminProductsTable({
  products,
  productCountLabel,
  sort,
  dir,
  updated,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const lastSelectedIndexRef = useRef<number | null>(null);
  const checkboxRefs = useRef<(HTMLInputElement | null)[]>([]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.artist.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q)
    );
  }, [products, query]);

  const visibleIds = useMemo(() => filteredProducts.map((product) => product.id), [filteredProducts]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIdSet.has(id));
  const returnTo = useMemo(() => {
    const nextParams = new URLSearchParams();

    if (updated) {
      nextParams.set("updated", updated);
    }

    if (sort !== "created") {
      nextParams.set("sort", sort);
      nextParams.set("dir", dir);
    }

    const query = nextParams.toString();
    return query ? `/admin/products?${query}` : "/admin/products";
  }, [dir, sort, updated]);

  const buildSortHref = (column: Exclude<SortKey, "created">) => {
    const nextParams = new URLSearchParams();
    const nextDirection: SortDirection =
      sort === column ? (dir === "asc" ? "desc" : "asc") : "desc";

    if (updated) {
      nextParams.set("updated", updated);
    }

    nextParams.set("sort", column);
    nextParams.set("dir", nextDirection);

    return `/admin/products?${nextParams.toString()}`;
  };

  const renderSortHeader = (label: string, column: Exclude<SortKey, "created">) => {
    const isActive = sort === column;
    const Icon = isActive && dir === "asc" ? ArrowUp : ArrowDown;

    return (
      <Link
        href={buildSortHref(column)}
        className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
      >
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5" />
      </Link>
    );
  };

  const toggleProduct = (
    productId: string,
    index: number,
    checked: boolean,
    withRange: boolean
  ) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (withRange && lastSelectedIndexRef.current !== null) {
        const start = Math.min(lastSelectedIndexRef.current, index);
        const end = Math.max(lastSelectedIndexRef.current, index);
        const rangeIds = products.slice(start, end + 1).map((product) => product.id);

        for (const id of rangeIds) {
          if (checked) {
            next.add(id);
          } else {
            next.delete(id);
          }
        }
      } else if (checked) {
        next.add(productId);
      } else {
        next.delete(productId);
      }

      return Array.from(next);
    });

    lastSelectedIndexRef.current = index;
  };

  const toggleAllProducts = () => {
    setSelectedIds(allVisibleSelected ? [] : visibleIds);
    lastSelectedIndexRef.current = allVisibleSelected ? null : visibleIds.length - 1;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Products ({productCountLabel})</h1>
        <div className="flex gap-2">
          <Link href="/admin/import" className="btn-secondary text-sm">
            CSV import
          </Link>
          <Link href="/admin/products/new" className="btn-primary text-sm">
            Add Product
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          type="search"
          placeholder="Search by artist or title…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input pl-10"
          aria-label="Search products"
        />
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input
              id="select-all-products"
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleAllProducts}
              className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
            />
            <label
              htmlFor="select-all-products"
              className="text-sm font-medium text-foreground"
            >
              Select / deselect all
            </label>
            <span className="text-xs uppercase tracking-[0.16em] text-muted">
              {selectedIds.length} selected
            </span>
          </div>

          <form action={bulkUpdateProducts} className="flex flex-wrap gap-2">
            <input type="hidden" name="returnTo" value={returnTo} />
            {selectedIds.map((id) => (
              <input key={id} type="hidden" name="selectedIds" value={id} />
            ))}
            <button type="submit" name="intent" value="hide" className="btn-secondary text-sm" disabled={selectedIds.length === 0}>
              Hide selected
            </button>
            <button type="submit" name="intent" value="relist" className="btn-secondary text-sm" disabled={selectedIds.length === 0}>
              Relist selected
            </button>
            <button type="submit" name="intent" value="delete" className="btn-secondary text-sm" disabled={selectedIds.length === 0}>
              Delete selected
            </button>
          </form>
        </div>

        <div className="flex flex-wrap gap-2">
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

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-hover">
            <tr>
              <th className="w-14 px-4 py-3 text-left font-medium text-foreground">
                <span className="sr-only">Select</span>
              </th>
              <th className="w-full px-4 py-3 text-left font-medium text-foreground">Product</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Format</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">
                {renderSortHeader("Price", "price")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-foreground">
                {renderSortHeader("Stock", "stock")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-foreground">
                {renderSortHeader("Status", "status")}
              </th>
              <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">
                  No products match &ldquo;{query}&rdquo;.
                </td>
              </tr>
            )}
            {filteredProducts.map((product, index) => (
              <tr
                key={product.id}
                className="border-b border-border last:border-0 hover:bg-surface-hover"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIdSet.has(product.id)}
                    ref={(el) => { checkboxRefs.current[index] = el; }}
                    onChange={(event) =>
                      toggleProduct(
                        product.id,
                        index,
                        event.currentTarget.checked,
                        Boolean((event.nativeEvent as MouseEvent | undefined)?.shiftKey)
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.shiftKey && event.key === "ArrowDown" && index < filteredProducts.length - 1) {
                        event.preventDefault();
                        if (!selectedIdSet.has(product.id)) {
                          toggleProduct(product.id, index, true, false);
                        }
                        const nextIndex = index + 1;
                        toggleProduct(filteredProducts[nextIndex].id, nextIndex, true, false);
                        checkboxRefs.current[nextIndex]?.focus();
                      }
                      if (event.shiftKey && event.key === "ArrowUp" && index > 0) {
                        event.preventDefault();
                        // Deselect current item and move focus up (contracts selection)
                        toggleProduct(product.id, index, false, false);
                        checkboxRefs.current[index - 1]?.focus();
                      }
                    }}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                    aria-label={`Select ${product.artist} ${product.title}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={`${product.artist} - ${product.title}`}
                        width={48}
                        height={48}
                        className="h-12 w-12 flex-shrink-0 rounded border border-border object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded border border-border bg-surface text-xs text-muted">
                        —
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground">
                        {product.discogsReleaseId ? (
                          <a
                            href={`https://www.discogs.com/release/${product.discogsReleaseId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-accent hover:underline"
                          >
                            {product.artist} — {product.title}
                            <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted" />
                          </a>
                        ) : (
                          <span>{product.artist} — {product.title}</span>
                        )}
                      </div>
                      {(product.pressingLabel || product.pressingCatalogNumber || product.pressingYear) && (
                        <div className="mt-0.5 text-xs text-muted">
                          {[product.pressingLabel, product.pressingCatalogNumber, product.pressingYear]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge badge-${product.format}`}>{product.format}</span>
                </td>
                <td className="px-4 py-3 text-foreground">
                  {formatEuroFromCents(product.priceCents)}
                </td>
                <td className="px-4 py-3 text-foreground">
                  <AdminStockForm
                    id={product.id}
                    stockQuantity={product.stockQuantity}
                    returnTo={returnTo}
                    compact
                  />
                </td>
                <td className="px-4 py-3">{statusBadge(product.status, product.id)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end flex-wrap gap-2">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted transition-colors hover:border-accent hover:text-accent"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                    {product.status !== "active" && (
                      <form action={relistProduct.bind(null, product.id)}>
                        <button
                          type="submit"
                          title={
                            product.stockQuantity > 0
                              ? "Relist this product in the catalog"
                              : "Relist this product and set stock to 1"
                          }
                          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted transition-colors hover:border-success hover:text-success"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Relist
                        </button>
                      </form>
                    )}
                    {product.status === "active" && (
                      <form action={archiveProduct.bind(null, product.id)}>
                        <button
                          type="submit"
                          title="Hide from catalog"
                          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted transition-colors hover:border-danger hover:text-danger"
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                          Hide
                        </button>
                      </form>
                    )}
                    <form action={deleteProduct.bind(null, product.id)}>
                      <button
                        type="submit"
                        title="Remove this product from admin and storefront"
                        className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted transition-colors hover:border-danger hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
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
