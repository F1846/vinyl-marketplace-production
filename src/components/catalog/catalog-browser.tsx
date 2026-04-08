"use client";

import { startTransition, useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Loader2, Search } from "lucide-react";
import { ProductCard } from "./product-card";
import type { CatalogProduct } from "@/lib/catalog";
import type { ProductFormat } from "@/types/product";

type CatalogBrowserProps = {
  initialProducts: CatalogProduct[];
  initialHasMore: boolean;
  initialQuery: {
    q: string;
    format?: ProductFormat;
    genre: string;
  };
  filters: {
    formats: ProductFormat[];
    genres: string[];
  };
};

type CatalogResponse = {
  products: CatalogProduct[];
  hasMore: boolean;
};

export function CatalogBrowser({
  initialProducts,
  initialHasMore,
  initialQuery,
  filters,
}: CatalogBrowserProps) {
  const [products, setProducts] = useState(initialProducts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [query, setQuery] = useState(initialQuery);
  const [draftQuery, setDraftQuery] = useState(initialQuery.q);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const activeLabel = useMemo(() => {
    if (query.q) {
      return `Results for "${query.q}"`;
    }
    if (query.genre) {
      return query.genre;
    }
    if (query.format) {
      return query.format;
    }
    return "All catalog";
  }, [query]);

  async function fetchCatalog(nextQuery: typeof query, offset = 0) {
    const params = new URLSearchParams();
    if (nextQuery.q) params.set("q", nextQuery.q);
    if (nextQuery.format) params.set("format", nextQuery.format);
    if (nextQuery.genre) params.set("genre", nextQuery.genre);
    params.set("offset", String(offset));
    params.set("limit", "20");

    const res = await fetch(`/api/catalog?${params.toString()}`);
    const json = (await res.json()) as CatalogResponse;

    if (!res.ok) {
      throw new Error("Could not load catalog");
    }

    return json;
  }

  function syncUrl(nextQuery: typeof query) {
    const params = new URLSearchParams();
    if (nextQuery.q) params.set("q", nextQuery.q);
    if (nextQuery.format) params.set("format", nextQuery.format);
    if (nextQuery.genre) params.set("genre", nextQuery.genre);
    const nextUrl = params.toString() ? `/catalog?${params.toString()}` : "/catalog";
    window.history.replaceState({}, "", nextUrl);
  }

  async function applyQuery(nextQuery: typeof query) {
    setLoading(true);
    try {
      const next = await fetchCatalog(nextQuery, 0);
      startTransition(() => {
        setProducts(next.products);
        setHasMore(next.hasMore);
        setQuery(nextQuery);
      });
      syncUrl(nextQuery);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const next = await fetchCatalog(query, products.length);
      startTransition(() => {
        setProducts((current) => [...current, ...next.products]);
        setHasMore(next.hasMore);
      });
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Catalog</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-4xl text-foreground">Shop the archive</h1>
            <p className="mt-2 text-sm leading-7 text-muted">
              Browse collector copies without leaving the page every time you filter.
            </p>
          </div>
          <div className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {activeLabel}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <div className="card space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Filter className="h-4 w-4" /> Filters
            </div>

            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void applyQuery({ ...query, q: draftQuery.trim() });
              }}
            >
              <label htmlFor="catalog-search" className="label">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted" />
                <input
                  id="catalog-search"
                  className="input pl-10"
                  value={draftQuery}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  placeholder="Artist, title, label"
                />
              </div>
              <button type="submit" className="btn-secondary w-full">
                Update results
              </button>
            </form>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Format</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void applyQuery({ ...query, format: undefined })}
                  className={query.format ? "btn-secondary" : "btn-primary"}
                >
                  All
                </button>
                {filters.formats.map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => void applyQuery({ ...query, format })}
                    className={query.format === format ? "btn-primary capitalize" : "btn-secondary capitalize"}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Genre</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void applyQuery({ ...query, genre: "" })}
                  className={query.genre ? "btn-secondary" : "btn-primary"}
                >
                  All
                </button>
                {filters.genres.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => void applyQuery({ ...query, genre })}
                    className={query.genre === genre ? "btn-primary" : "btn-secondary"}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          {loading ? (
            <div className="card flex min-h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">
                  {products.length} result{products.length === 1 ? "" : "s"} loaded
                </p>
                {hasMore ? (
                  <button
                    type="button"
                    onClick={() => void handleLoadMore()}
                    className="btn-secondary"
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading
                      </>
                    ) : (
                      "Load more"
                    )}
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="card py-12 text-center">
              <p className="text-lg text-muted">No items match your filters.</p>
              <Link href="/catalog" className="btn-secondary mt-4 inline-flex">
                Clear filters
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
