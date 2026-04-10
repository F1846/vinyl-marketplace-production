"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Filter, Loader2, Search } from "lucide-react";
import { ProductCard } from "./product-card";
import { useDictionary } from "@/components/providers/locale-provider";
import type { CatalogProduct, CatalogSort } from "@/lib/catalog";
import { formatMessage } from "@/lib/i18n/format";
import type { ProductFormat } from "@/types/product";

type CatalogBrowserProps = {
  initialProducts: CatalogProduct[];
  initialHasMore: boolean;
  initialTotalCount: number;
  initialQuery: {
    q: string;
    format?: ProductFormat;
    genre: string;
    sort: CatalogSort;
  };
  filters: {
    formats: ProductFormat[];
    genres: string[];
  };
};

type CatalogResponse = {
  products: CatalogProduct[];
  hasMore: boolean;
  totalCount: number;
};

const PAGE_SIZE = 24;
const AUTO_LOAD_BURST_LIMIT = 4;
const SORT_OPTIONS: Array<{ value: CatalogSort; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "title-asc", label: "Title: A to Z" },
  { value: "title-desc", label: "Title: Z to A" },
  { value: "label-asc", label: "Label: A to Z" },
  { value: "label-desc", label: "Label: Z to A" },
];

const filterButtonBaseClass =
  "rounded-full border px-3 py-1.5 text-[0.84rem] font-medium transition-colors";

function getFilterButtonClass(isActive: boolean, extra = "") {
  return [
    isActive
      ? `${filterButtonBaseClass} border-foreground bg-accent text-white`
      : `${filterButtonBaseClass} border-border bg-surface text-foreground hover:border-foreground/20 hover:bg-surface-hover`,
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

export function CatalogBrowser({
  initialProducts,
  initialHasMore,
  initialTotalCount,
  initialQuery,
  filters,
}: CatalogBrowserProps) {
  const dictionary = useDictionary();
  const [products, setProducts] = useState(initialProducts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [query, setQuery] = useState(initialQuery);
  const [draftQuery, setDraftQuery] = useState(initialQuery.q);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [autoLoadBurstCount, setAutoLoadBurstCount] = useState(0);
  const autoLoadRef = useRef<HTMLDivElement | null>(null);
  const autoLoadEnabled = hasMore && autoLoadBurstCount < AUTO_LOAD_BURST_LIMIT;
  // Keep a ref to avoid stale closures in the debounce effect
  const queryRef = useRef(query);

  // Keep queryRef current so debounce effect always uses the latest query
  queryRef.current = query;

  useEffect(() => {
    setProducts(initialProducts);
    setHasMore(initialHasMore);
    setTotalCount(initialTotalCount);
    setQuery(initialQuery);
    setDraftQuery(initialQuery.q);
    setLoading(false);
    setLoadingMore(false);
    setAutoLoadBurstCount(0);
  }, [
    initialHasMore,
    initialProducts,
    initialQuery,
    initialQuery.format,
    initialQuery.genre,
    initialQuery.q,
    initialQuery.sort,
    initialTotalCount,
  ]);

  // Live search: fire applyQuery 350 ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = draftQuery.trim();
      if (trimmed !== queryRef.current.q) {
        void applyQuery({ ...queryRef.current, q: trimmed });
      }
    }, 350);
    return () => clearTimeout(timer);
    // applyQuery is stable (useCallback with no changing deps); draftQuery is the trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftQuery]);

  const activeLabel = useMemo(() => {
    if (query.q) {
      return formatMessage(dictionary.catalog.activeResultsFor, { query: query.q });
    }
    if (query.genre) {
      return query.genre;
    }
    if (query.format) {
      return query.format;
    }
    return dictionary.catalog.activeAllCatalog;
  }, [dictionary.catalog.activeAllCatalog, dictionary.catalog.activeResultsFor, query]);

  const fetchCatalog = useCallback(async (nextQuery: typeof query, offset = 0) => {
    const params = new URLSearchParams();
    if (nextQuery.q) params.set("q", nextQuery.q);
    if (nextQuery.format) params.set("format", nextQuery.format);
    if (nextQuery.genre) params.set("genre", nextQuery.genre);
    if (nextQuery.sort !== "newest") params.set("sort", nextQuery.sort);
    params.set("offset", String(offset));
    params.set("limit", String(PAGE_SIZE));

    const res = await fetch(`/api/catalog?${params.toString()}`);
    const json = (await res.json()) as CatalogResponse;

    if (!res.ok) {
        throw new Error("Could not load catalog");
    }

    return json;
  }, []);

  function syncUrl(nextQuery: typeof query) {
    const params = new URLSearchParams();
    if (nextQuery.q) params.set("q", nextQuery.q);
    if (nextQuery.format) params.set("format", nextQuery.format);
    if (nextQuery.genre) params.set("genre", nextQuery.genre);
    if (nextQuery.sort !== "newest") params.set("sort", nextQuery.sort);
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
        setTotalCount(next.totalCount);
        setQuery(nextQuery);
        setAutoLoadBurstCount(0);
      });
      syncUrl(nextQuery);
    } finally {
      setLoading(false);
    }
  }

  const handleLoadMore = useCallback(async (mode: "auto" | "manual" = "manual") => {
    setLoadingMore(true);
    try {
      const next = await fetchCatalog(query, products.length);
      startTransition(() => {
        setProducts((current) => [...current, ...next.products]);
        setHasMore(next.hasMore);
        setTotalCount(next.totalCount);
        setAutoLoadBurstCount((current) =>
          mode === "auto" ? current + 1 : 0
        );
      });
    } finally {
      setLoadingMore(false);
    }
  }, [fetchCatalog, products.length, query]);

  useEffect(() => {
    const node = autoLoadRef.current;
    if (!node || !autoLoadEnabled || loading || loadingMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void handleLoadMore("auto");
        }
      },
      { rootMargin: "240px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [autoLoadEnabled, handleLoadMore, loading, loadingMore]);

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">{dictionary.catalog.catalog}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-sans text-[2rem] font-bold leading-[0.98] tracking-[-0.04em] text-foreground sm:text-[2.15rem]">
              {dictionary.catalog.shopArchive}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              {dictionary.catalog.browseWithoutReload}
            </p>
          </div>
          <div className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {activeLabel}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr] xl:grid-cols-[230px_1fr]">
        <aside className="space-y-4">
          <div className="card space-y-4 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Filter className="h-4 w-4" /> {dictionary.catalog.filters}
            </div>

            <div className="space-y-3">
              <p className="font-sans text-base font-bold tracking-[-0.03em] text-foreground">
                {dictionary.catalog.format}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void applyQuery({ ...query, format: undefined })}
                  className={getFilterButtonClass(!query.format)}
                >
                  {dictionary.common.all}
                </button>
                {filters.formats.map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => void applyQuery({ ...query, format })}
                    className={getFilterButtonClass(query.format === format, "capitalize")}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="font-sans text-base font-bold tracking-[-0.03em] text-foreground">
                {dictionary.catalog.genre}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void applyQuery({ ...query, genre: "" })}
                  className={getFilterButtonClass(!query.genre)}
                >
                  {dictionary.common.all}
                </button>
                {filters.genres.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => void applyQuery({ ...query, genre })}
                    className={getFilterButtonClass(query.genre === genre)}
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
              <div className="space-y-3 rounded-[1.3rem] border border-border bg-white p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <p className="text-sm text-muted">
                    {formatMessage(dictionary.catalog.resultsShowing, {
                      shown: products.length,
                      total: totalCount,
                      suffix: totalCount === 1 ? "" : "s",
                    })}
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:flex-1 xl:justify-end">
                    <div className="relative sm:flex-1 xl:max-w-2xl">
                      <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted" />
                      <input
                        id="catalog-search"
                        className="input pl-10"
                        value={draftQuery}
                        onChange={(event) => setDraftQuery(event.target.value)}
                        placeholder={dictionary.catalog.artistTitleLabel}
                        aria-label={dictionary.catalog.search}
                      />
                    </div>
                    <div className="flex items-center gap-3 sm:justify-end">
                      <label htmlFor="catalog-sort" className="text-sm font-medium text-foreground">
                        {dictionary.catalog.sort}
                      </label>
                      <select
                        id="catalog-sort"
                        className="input w-full min-w-[220px] sm:w-auto"
                        value={query.sort}
                        onChange={(event) =>
                          void applyQuery({
                            ...query,
                            sort: event.target.value as CatalogSort,
                          })
                        }
                      >
                        {SORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {{
                              newest: dictionary.catalog.sortNewest,
                              "price-asc": dictionary.catalog.sortPriceAsc,
                              "price-desc": dictionary.catalog.sortPriceDesc,
                              "title-asc": dictionary.catalog.sortTitleAsc,
                              "title-desc": dictionary.catalog.sortTitleDesc,
                              "label-asc": dictionary.catalog.sortLabelAsc,
                              "label-desc": dictionary.catalog.sortLabelDesc,
                            }[option.value]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} size="compact" />
                ))}
              </div>
              <div ref={autoLoadRef} className="flex min-h-16 items-center justify-center">
                {loadingMore ? (
                  <p className="inline-flex items-center gap-2 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    {dictionary.catalog.loadingMore}
                  </p>
                ) : autoLoadEnabled ? (
                  <p className="text-sm text-muted">{dictionary.catalog.scrollToLoad}</p>
                ) : hasMore ? (
                  <div className="rounded-[1rem] border border-border bg-white px-4 py-4 text-center shadow-card">
                    <p className="text-sm text-muted">
                      {dictionary.catalog.autoLoadPaused}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleLoadMore("manual")}
                      className="btn-secondary mt-3"
                    >
                      {dictionary.catalog.loadMore}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-muted">{dictionary.catalog.allLoaded}</p>
                )}
              </div>
            </>
          ) : (
            <div className="card py-12 text-center">
              <p className="text-lg text-muted">{dictionary.catalog.noMatches}</p>
              <Link href="/catalog" className="btn-secondary mt-4 inline-flex">
                {dictionary.common.clearFilters}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
