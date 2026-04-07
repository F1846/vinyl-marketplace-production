import { db, schema } from "@/db";
import { eq, desc, sql } from "drizzle-orm";
import { Suspense } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/catalog/product-card";
import { Filter, Search as SearchIcon } from "lucide-react";

export default function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; format?: string; genre?: string; page?: string }>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Catalog</h1>
      </div>

      <Suspense>
        <CatalogContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CatalogContent({ searchParams }: { searchParams: CatalogPage["searchParams"] }) {
  const params = await searchParams;
  const q = params.q ?? "";
  const format = params.format as "vinyl" | "cassette" | "cd" | undefined;
  const genre = params.genre ?? "";
  const page = parseInt(params.page ?? "1", 10);
  const perPage = 20;

  const d = db();

  // Build filters
  const conditions = [eq(schema.products.status, "active")];
  if (format) conditions.push(eq(schema.products.format, format));
  if (genre) conditions.push(eq(schema.products.genre, genre));

  const products = await d.query.products.findMany({
    where: conditions.length > 0 ? conditions[0] : undefined,
    with: { images: { orderBy: [schema.productImages.sortOrder] } },
    limit: perPage + 1, // +1 to check if there's a next page
    offset: (page - 1) * perPage,
    orderBy: [desc(schema.products.createdAt)],
  });

  const hasMore = products.length > perPage;
  const pageProducts = products.slice(0, perPage);

  // Fetch distinct genres and formats for filter sidebar
  const genres = await d
    .select({ genre: schema.products.genre })
    .from(schema.products)
    .where(eq(schema.products.status, "active"))
    .groupBy(schema.products.genre)
    .orderBy(schema.products.genre);

  const formats = await d
    .select({ format: schema.products.format })
    .from(schema.products)
    .where(eq(schema.products.status, "active"))
    .groupBy(schema.products.format);

  return (
    <div className="flex gap-6">
      {/* Filter sidebar */}
      <aside className="w-64 flex-shrink-0 space-y-6">
        {/* Format filter */}
        <div className="card space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Filter className="h-4 w-4" /> Format
          </h2>
          <div className="space-y-2 text-sm">
            <Link
              href={`/catalog${genre ? `?genre=${genre}` : ""}`}
              className={`block text-foreground transition-colors hover:text-accent`}
            >
              All
            </Link>
            {formats.map((f) => (
              <Link
                key={f.format}
                href={`/catalog${genHref({ format: f.format, genre, q })}`}
                className={`block capitalize text-foreground transition-colors hover:text-accent`}
              >
                {f.format}
              </Link>
            ))}
          </div>
        </div>

        {/* Genre filter */}
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Genre</h2>
          <div className="space-y-2 text-sm">
            <Link
              href={`/catalog${format ? `?format=${format}` : ""}`}
              className={`block text-foreground transition-colors hover:text-accent`}
            >
              All
            </Link>
            {genres.map((g) => (
              <Link
                key={g.genre}
                href={`/catalog${genHref({ format, genre: g.genre, q })}`}
                className={`block text-foreground transition-colors hover:text-accent`}
              >
                {g.genre}
              </Link>
            ))}
          </div>
        </div>
      </aside>

      {/* Product grid */}
      <div className="flex-1">
        {/* Search bar */}
        <form className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute top-2.5 left-3 h-5 w-5 text-muted" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search artist, album, label..."
              className="input pl-10"
              formAction={""}
              type="search"
            />
          </div>
          <button type="submit" className="btn-secondary">Search</button>
        </form>

        {pageProducts.length > 0 ? (
          <>
            <p className="mb-4 text-sm text-muted">
              {pageProducts.length} result{pageProducts.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
              {pageProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <Link href={`/catalog${genHref({ format, genre, q })}&page=${page + 1}`} className="btn-secondary">
                  Load More
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="card py-12 text-center">
            <p className="text-lg text-muted">No items match your filters</p>
            <Link href="/catalog" className="btn-secondary mt-4 inline-block">Clear all filters</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function genHref(opts: { format?: string; genre?: string; q?: string }): string {
  const params = new URLSearchParams();
  if (opts.format) params.set("format", opts.format);
  if (opts.genre) params.set("genre", opts.genre);
  if (opts.q) params.set("q", opts.q);
  return `?${params.toString()}`;
}
