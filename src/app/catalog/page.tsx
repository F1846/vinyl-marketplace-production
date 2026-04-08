import type { Metadata } from "next";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { catalogSortValues, getCatalogFilters, getCatalogPage } from "@/lib/catalog";
import type { ProductFormat } from "@/types/product";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Catalog",
  description:
    "Browse graded electronic music vinyl, cassette, and CD listings from Federico Shop.",
  alternates: {
    canonical: "/catalog",
  },
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; format?: string; genre?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const genre = params.genre ?? "";
  const sort = catalogSortValues.includes((params.sort ?? "") as (typeof catalogSortValues)[number])
    ? ((params.sort ?? "newest") as (typeof catalogSortValues)[number])
    : "newest";
  const format =
    params.format === "vinyl" || params.format === "cassette" || params.format === "cd"
      ? (params.format as ProductFormat)
      : undefined;

  const [catalog, filters] = await Promise.all([
    getCatalogPage({ q, format, genre, sort, limit: 24, offset: 0 }),
    getCatalogFilters(),
  ]);

  return (
    <CatalogBrowser
      initialProducts={catalog.products}
      initialHasMore={catalog.hasMore}
      initialTotalCount={catalog.totalCount}
      initialQuery={{ q, format, genre, sort }}
      filters={filters}
    />
  );
}
