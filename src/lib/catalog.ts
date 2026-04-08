import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db, schema } from "@/db";
import type { MediaCondition, ProductFormat } from "@/types/product";

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
  }>;
};

export type CatalogQuery = {
  q?: string;
  format?: ProductFormat;
  genre?: string;
  offset?: number;
  limit?: number;
};

export async function getCatalogPage({
  q = "",
  format,
  genre = "",
  offset = 0,
  limit = 20,
}: CatalogQuery) {
  const d = db();
  const whereConditions = [eq(schema.products.status, "active")];

  if (format) {
    whereConditions.push(eq(schema.products.format, format));
  }

  if (genre) {
    whereConditions.push(eq(schema.products.genre, genre));
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

  const products = await d.query.products.findMany({
    where: and(...whereConditions),
    with: { images: { orderBy: [schema.productImages.sortOrder] } },
    limit: limit + 1,
    offset,
    orderBy: [desc(schema.products.createdAt)],
  });

  return {
    products: products.slice(0, limit) as CatalogProduct[],
    hasMore: products.length > limit,
  };
}

export async function getCatalogFilters() {
  const d = db();
  const allActive = await d.query.products.findMany({
    where: eq(schema.products.status, "active"),
    columns: { genre: true, format: true },
  });

  return {
    genres: [...new Set(allActive.map((product) => product.genre))].sort(),
    formats: [...new Set(allActive.map((product) => product.format))].sort() as ProductFormat[],
  };
}
