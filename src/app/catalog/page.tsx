import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { getCatalogFilters, getCatalogPage } from "@/lib/catalog";
import type { ProductFormat } from "@/types/product";

export const dynamic = "force-dynamic";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; format?: string; genre?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const genre = params.genre ?? "";
  const format =
    params.format === "vinyl" || params.format === "cassette" || params.format === "cd"
      ? (params.format as ProductFormat)
      : undefined;

  const [catalog, filters] = await Promise.all([
    getCatalogPage({ q, format, genre, limit: 20, offset: 0 }),
    getCatalogFilters(),
  ]);

  return (
    <CatalogBrowser
      initialProducts={catalog.products}
      initialHasMore={catalog.hasMore}
      initialQuery={{ q, format, genre }}
      filters={filters}
    />
  );
}
