"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  EyeOff,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  archiveProduct,
  bulkUpdateProducts,
  deleteProduct,
  relistProduct,
} from "@/actions/products";
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
};

type Props = {
  products: AdminProductRow[];
  productCountLabel: number;
  sort: SortKey;
  dir: SortDirection;
  updated?: string;
};

function statusBadge(status: ProductStatus) {
  const cls = {
    active: "badge-active",
    sold_out: "badge-sold",
    archived: "badge-archived",
  }[status];

  return <span className={cls}>{status}</span>;
}

export function AdminProductsTable({
  products,
  productCountLabel,
  sort,
  dir,
  updated,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const lastSelectedIndexRef = useRef<number | null>(null);
  const visibleIds = useMemo(() => products.map((product) => product.id), [products]);
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

  const selectByStatuses = (statuses: ProductStatus[]) => {
    const nextIds = products
      .filter((product) => statuses.includes(product.status))
      .map((product) => product.id);

    setSelectedIds(nextIds);
    lastSelectedIndexRef.current =
      nextIds.length > 0
        ? products.findIndex((product) => product.id === nextIds[nextIds.length - 1])
        : null;
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
            Import CSV
          </Link>
          <Link href="/admin/products/new" className="btn-primary text-sm">
            Add Product
          </Link>
        </div>
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
            <span className="text-xs text-muted">
              Tip: Shift-click another checkbox to select a range.
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
            onClick={() => selectByStatuses(["active"])}
            className="btn-secondary text-sm"
          >
            Select active
          </button>
          <button
            type="button"
            onClick={() => selectByStatuses(["sold_out"])}
            className="btn-secondary text-sm"
          >
            Select sold out
          </button>
          <button
            type="button"
            onClick={() => selectByStatuses(["archived"])}
            className="btn-secondary text-sm"
          >
            Select archived
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

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-hover">
            <tr>
              <th className="w-14 px-4 py-3 text-left font-medium text-foreground">
                <span className="sr-only">Select</span>
              </th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Product</th>
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
            {products.map((product, index) => (
              <tr
                key={product.id}
                className="border-b border-border last:border-0 hover:bg-surface-hover"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIdSet.has(product.id)}
                    onChange={(event) =>
                      toggleProduct(
                        product.id,
                        index,
                        event.currentTarget.checked,
                        Boolean((event.nativeEvent as MouseEvent | undefined)?.shiftKey)
                      )
                    }
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                    aria-label={`Select ${product.artist} ${product.title}`}
                  />
                </td>
                <td className="px-4 py-3 text-foreground">
                  {product.artist} &ndash; {product.title}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge badge-${product.format}`}>{product.format}</span>
                </td>
                <td className="px-4 py-3 text-foreground">
                  {formatEuroFromCents(product.priceCents)}
                </td>
                <td className="px-4 py-3 text-foreground">{product.stockQuantity}</td>
                <td className="px-4 py-3">{statusBadge(product.status)}</td>
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
