import type { Metadata } from "next";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { JsonLd } from "@/components/seo/json-ld";
import { catalogSortValues, getCatalogFilters, getCatalogPage } from "@/lib/catalog";
import { buildCatalogUrl, siteConfig, siteUrl } from "@/lib/site";
import type { ProductFormat } from "@/types/product";

export const dynamic = "force-dynamic";

function normalizeCatalogParams(params: {
  q?: string;
  format?: string;
  genre?: string;
  sort?: string;
}) {
  const q = params.q?.trim() ?? "";
  const genre = params.genre?.trim() ?? "";
  const sort = catalogSortValues.includes((params.sort ?? "") as (typeof catalogSortValues)[number])
    ? ((params.sort ?? "newest") as (typeof catalogSortValues)[number])
    : "newest";
  const format =
    params.format === "vinyl" || params.format === "cassette" || params.format === "cd"
      ? (params.format as ProductFormat)
      : undefined;

  return { q, format, genre, sort };
}

function getCatalogSeoMeta(query: { q: string; format?: ProductFormat; genre: string }) {
  const formatLabel =
    query.format === "vinyl"
      ? "Vinyl Records"
      : query.format === "cassette"
        ? "Cassette Tapes"
        : query.format === "cd"
          ? "CDs"
          : "Records";

  if (query.genre && query.format) {
    return {
      title: `${query.genre} ${formatLabel} Catalog`,
      description: `Browse graded ${query.genre.toLowerCase()} ${query.format} copies from Federico Shop, the Berlin electronic music record shop for collector vinyl, cassette, and CD finds.`,
      keywords: [
        `${query.genre} ${query.format}`,
        `${query.genre} ${formatLabel.toLowerCase()}`,
        `${query.genre} records`,
        `Federico Shop ${query.genre}`,
      ],
      canonical: buildCatalogUrl({ format: query.format, genre: query.genre }),
    };
  }

  if (query.genre) {
    return {
      title: `${query.genre} Records Catalog`,
      description: `Shop ${query.genre.toLowerCase()} records, vinyl, cassette, and CD listings from Federico Shop in Berlin.`,
      keywords: [
        `${query.genre} records`,
        `${query.genre} vinyl`,
        `${query.genre} catalog`,
        `Federico Shop ${query.genre}`,
      ],
      canonical: buildCatalogUrl({ genre: query.genre }),
    };
  }

  if (query.format) {
    return {
      title: `${formatLabel} Catalog`,
      description: `Browse graded ${query.format} listings from Federico Shop, including techno, electro, EBM, darkwave, ambient, and post-punk releases.`,
      keywords: [
        `${query.format} catalog`,
        `${query.format} shop`,
        `${query.format} records`,
        `Federico Shop ${query.format}`,
      ],
      canonical: buildCatalogUrl({ format: query.format }),
    };
  }

  if (query.q) {
    return {
      title: `Search results for "${query.q}"`,
      description: `Search Federico Shop for ${query.q} across graded vinyl, cassette, and CD listings.`,
      keywords: [`${query.q}`, `${query.q} records`, `${query.q} vinyl`, "Federico Shop search"],
      canonical: buildCatalogUrl({ q: query.q }),
    };
  }

  return {
    title: "Catalog | Techno, EBM, Darkwave Vinyl, Tape & CD",
    description:
      "Browse graded techno, electro, EBM, darkwave, post-punk, ambient, vinyl, cassette, and CD listings from Federico Shop in Berlin.",
    keywords: [
      "techno vinyl catalog",
      "electro records shop",
      "EBM records shop",
      "darkwave vinyl online",
      "post-punk records",
      "electronic music catalog",
      ...siteConfig.seoKeywords.slice(0, 6),
    ],
    canonical: siteUrl("/catalog"),
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; format?: string; genre?: string; sort?: string }>;
}): Promise<Metadata> {
  const params = normalizeCatalogParams(await searchParams);
  const seo = getCatalogSeoMeta(params);

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: {
      canonical: seo.canonical,
    },
    openGraph: {
      title: `${seo.title} | ${siteConfig.name}`,
      description: seo.description,
      url: seo.canonical,
    },
  };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; format?: string; genre?: string; sort?: string }>;
}) {
  const { q, genre, sort, format } = normalizeCatalogParams(await searchParams);
  const seo = getCatalogSeoMeta({ q, genre, format });

  const [catalog, filters] = await Promise.all([
    getCatalogPage({ q, format, genre, sort, limit: 24, offset: 0 }),
    getCatalogFilters(),
  ]);
  const catalogStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: seo.title,
    url: seo.canonical,
    description: seo.description,
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
