import type { Metadata } from "next";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { catalogSortValues, getCatalogFilters, getCatalogPage } from "@/lib/catalog";
import { siteUrl } from "@/lib/site";
import type { ProductFormat } from "@/types/product";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Catalog | Techno, EBM, Darkwave Vinyl, Tape & CD",
  description:
    "Browse graded techno, EBM, darkwave, post-punk, ambient, vinyl, cassette, and CD listings from Federico Shop.",
  keywords: [
    "techno vinyl catalog",
    "EBM records shop",
    "darkwave vinyl online",
    "post-punk records",
    "electronic music catalog",
  ],
  alternates: {
    canonical: siteUrl("/catalog"),
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
  const catalogStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Federico Shop Catalog",
    url: siteUrl("/catalog"),
    description: metadata.description,
    hasPart: catalog.products.map((product) => ({
      "@type": "Product",
      name: `${product.artist} - ${product.title}`,
      url: siteUrl(`/products/${product.id}`),
      image: product.images[0]?.url,
      category: [product.genre, product.format].filter(Boolean).join(" / "),
    })),
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(catalogStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
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
