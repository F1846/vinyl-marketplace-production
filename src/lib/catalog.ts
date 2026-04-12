import { and, asc, desc, eq, gt, ilike, isNull, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { MediaCondition, ProductFormat } from "@/types/product";

export const catalogSortValues = [
  "newest",
  "price-asc",
  "price-desc",
  "title-asc",
  "title-desc",
  "label-asc",
  "label-desc",
] as const;

export type CatalogSort = (typeof catalogSortValues)[number];

export type CatalogProduct = {
  id: string;
  artist: string;
  title: string;
  format: ProductFormat;
  genre: string;
  priceCents: number;
  stockQuantity: number;
  conditionMedia: MediaCondition | null;
  images: Array<{
    id: string;
    url: string;
    sortOrder: number;
    displayZoom: number;
  }>;
};

export type CatalogQuery = {
  q?: string;
  format?: ProductFormat;
  genre?: string | string[];
  sort?: CatalogSort;
  offset?: number;
  limit?: number;
};

export async function getCatalogPage({
  q = "",
  format,
  genre = "",
  sort = "newest",
  offset = 0,
  limit = 24,
}: CatalogQuery) {
  const d = db();
  const genres = (Array.isArray(genre) ? genre : genre ? [genre] : [])
    .map((value) => value.trim())
    .filter(Boolean);
  const whereConditions = [
    eq(schema.products.status, "active"),
    gt(schema.products.stockQuantity, 0),
    isNull(schema.products.deletedAt),
  ];

  if (format) {
    whereConditions.push(eq(schema.products.format, format));
  }

  if (genres.length === 1) {
    whereConditions.push(eq(schema.products.genre, genres[0]!));
  } else if (genres.length > 1) {
    whereConditions.push(or(...genres.map((value) => eq(schema.products.genre, value)))!);
  }

  if (q) {
    whereConditions.push(
      or(
        ilike(schema.products.artist, `%${q}%`),
        ilike(schema.products.title, `%${q}%`),
        ilike(schema.products.pressingLabel, `%${q}%`)
      )!
    );
  }

  const where = and(...whereConditions);
  const orderBy =
    sort === "price-asc"
      ? [asc(schema.products.priceCents), asc(schema.products.artist), asc(schema.products.title)]
      : sort === "price-desc"
        ? [desc(schema.products.priceCents), asc(schema.products.artist), asc(schema.products.title)]
        : sort === "title-asc"
          ? [asc(schema.products.title), asc(schema.products.artist)]
          : sort === "title-desc"
            ? [desc(schema.products.title), asc(schema.products.artist)]
            : sort === "label-asc"
              ? [asc(schema.products.pressingLabel), asc(schema.products.artist), asc(schema.products.title)]
              : sort === "label-desc"
                ? [desc(schema.products.pressingLabel), asc(schema.products.artist), asc(schema.products.title)]
                : [desc(schema.products.createdAt)];

  const [{ count }] = await d
    .select({ count: sql<number>`count(*)` })
    .from(schema.products)
    .where(where);

  const products = await d.query.products.findMany({
    where,
    with: { images: { orderBy: [schema.productImages.sortOrder] } },
    limit: limit + 1,
    offset,
    orderBy,
  });

  return {
    products: products.slice(0, limit) as CatalogProduct[],
    hasMore: products.length > limit,
    totalCount: count ?? 0,
  };
}

export async function getCatalogFilters() {
  const d = db();
  const allActive = await d.query.products.findMany({
    where: and(
      eq(schema.products.status, "active"),
      gt(schema.products.stockQuantity, 0),
      isNull(schema.products.deletedAt)
    ),
    columns: { genre: true, format: true },
  });

  return {
    genres: [...new Set(allActive.map((product) => product.genre))].sort(),
    formats: [...new Set(allActive.map((product) => product.format))].sort() as ProductFormat[],
  };
}
