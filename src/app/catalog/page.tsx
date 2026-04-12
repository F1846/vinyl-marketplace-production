import type { Metadata } from "next";

import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { JsonLd } from "@/components/seo/json-ld";
import { catalogSortValues, getCatalogFilters, getCatalogPage } from "@/lib/catalog";
import { buildCatalogMetadata, getCatalogSeoMeta } from "@/lib/catalog-seo";
import { siteConfig, siteUrl } from "@/lib/site";
import type { ProductFormat } from "@/types/product";

export const dynamic = "force-dynamic";

function normalizeCatalogParams(params: {
  q?: string;
  format?: string;
  genre?: string | string[];
  sort?: string;
}) {
  const q = params.q?.trim() ?? "";
  const genre = (Array.isArray(params.genre) ? params.genre : params.genre ? [params.genre] : [])
    .map((value) => value.trim())
    .filter(Boolean);
  const sort = catalogSortValues.includes(
    (params.sort ?? "") as (typeof catalogSortValues)[number],
  )
    ? ((params.sort ?? "newest") as (typeof catalogSortValues)[number])
    : "newest";

  const format =
    params.format === "vinyl" || params.format === "cassette" || params.format === "cd"
      ? (params.format as ProductFormat)
      : undefined;

  return { q, format, genre, sort };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; format?: string; genre?: string | string[]; sort?: string }>;
}): Promise<Metadata> {
  const params = normalizeCatalogParams(await searchParams);
  const metadata = buildCatalogMetadata(params);

  return {
    ...metadata,
    keywords: [
      ...((Array.isArray(metadata.keywords) ? metadata.keywords : []) as string[]),
      siteConfig.name,
      "Berlin-based online record shop",
    ],
    openGraph: {
      ...metadata.openGraph,
      siteName: siteConfig.name,
    },
  };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; format?: string; genre?: string | string[]; sort?: string }>;
}) {
  const { q, genre, sort, format } = normalizeCatalogParams(await searchParams);
  const seo = getCatalogSeoMeta({ q, genre, format, sort });

  const [catalog, filters] = await Promise.all([
    getCatalogPage({ q, format, genre, sort, limit: 50, offset: 0 }),
    getCatalogFilters(),
  ]);

  // Use the summary-page ItemList pattern: each ListItem has only position + url.
  // Google follows each url to the individual product page to validate the full
  // Product schema (with offers, seller, itemCondition). Embedding inline Product
  // items with both url AND item caused Google to surface validation errors on
  // /catalog rather than the canonical product URLs.
  const catalogStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: seo.title,
    url: seo.canonical,
    description: seo.description,
    keywords: seo.keywords.join(", "),
    isPartOf: {
      "@id": `${siteConfig.baseUrl}#website`,
    },
    mainEntity: {
      "@type": "ItemList",
      name: seo.title,
      numberOfItems: catalog.products.length,
      itemListElement: catalog.products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: siteUrl(`/products/${product.id}`),
      })),
    },
  };

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Catalog",
        item: siteUrl("/catalog"),
      },
    ],
  };

  return (
    <>
      <JsonLd data={catalogStructuredData} />
      <JsonLd data={breadcrumbStructuredData} />
      <CatalogBrowser
        initialProducts={catalog.products}
        initialHasMore={catalog.hasMore}
        initialTotalCount={catalog.totalCount}
        initialQuery={{ q, format, genre, sort }}
        filters={filters}
      />
    </>
  );
}
