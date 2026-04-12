import type { Metadata } from "next";
import { buildCatalogUrl, siteConfig, siteUrl } from "@/lib/site";
import type { ProductFormat } from "@/types/product";

type CatalogSeoQuery = {
  q: string;
  format?: ProductFormat;
  genre: string[];
  sort: string;
};

type CatalogSeoMeta = {
  title: string;
  description: string;
  keywords: string[];
  canonical: string;
  indexable: boolean;
};

export function getCatalogSeoMeta(query: CatalogSeoQuery): CatalogSeoMeta {
  const formatLabel =
    query.format === "vinyl"
      ? "Vinyl Records"
      : query.format === "cassette"
        ? "Cassette Tapes"
        : query.format === "cd"
          ? "CDs"
          : "Records";
  const canonical = buildCatalogUrl({
    format: query.format,
    genre: query.genre.length > 0 ? query.genre : undefined,
  });
  const indexable = query.q.length === 0 && query.sort === "newest";

  if (query.genre.length === 1 && query.format) {
    const primaryGenre = query.genre[0]!;
    return {
      title: `${primaryGenre} ${formatLabel} Catalog`,
      description: `Browse graded ${primaryGenre.toLowerCase()} ${query.format} copies from Federico Shop, the Berlin-based online record shop for collector vinyl, cassette, and CD finds.`,
      keywords: [
        `${primaryGenre} ${query.format}`,
        `${primaryGenre} ${formatLabel.toLowerCase()}`,
        `${primaryGenre} records`,
        `Federico Shop ${primaryGenre}`,
      ],
      canonical,
      indexable,
    };
  }

  if (query.genre.length === 1) {
    const primaryGenre = query.genre[0]!;
    return {
      title: `${primaryGenre} Records Catalog`,
      description: `Shop ${primaryGenre.toLowerCase()} records, vinyl, cassette, and CD listings from Federico Shop in Berlin.`,
      keywords: [
        `${primaryGenre} records`,
        `${primaryGenre} vinyl`,
        `${primaryGenre} catalog`,
        `Federico Shop ${primaryGenre}`,
      ],
      canonical,
      indexable,
    };
  }

  if (query.genre.length > 1) {
    const label = query.genre.join(", ");
    return {
      title: `${label} Records Catalog`,
      description: `Browse ${label.toLowerCase()} records, vinyl, cassette, and CD listings from Federico Shop in Berlin.`,
      keywords: [
        ...query.genre.map((value) => `${value} records`),
        ...query.genre.map((value) => `${value} vinyl`),
        "Federico Shop catalog",
      ],
      canonical,
      indexable,
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
      canonical,
      indexable,
    };
  }

  if (query.q) {
    return {
      title: `Search results for "${query.q}"`,
      description: `Search Federico Shop for ${query.q} across graded vinyl, cassette, and CD listings.`,
      keywords: [
        `${query.q}`,
        `${query.q} records`,
        `${query.q} vinyl`,
        "Federico Shop search",
      ],
      canonical,
      indexable,
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
    indexable: true,
  };
}

export function buildCatalogMetadata(query: CatalogSeoQuery): Metadata {
  const seo = getCatalogSeoMeta(query);

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: {
      canonical: seo.canonical,
    },
    robots: {
      index: seo.indexable,
      follow: true,
    },
    openGraph: {
      title: `${seo.title} | ${siteConfig.name}`,
      description: seo.description,
      url: seo.canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: `${seo.title} | ${siteConfig.name}`,
      description: seo.description,
    },
  };
}
