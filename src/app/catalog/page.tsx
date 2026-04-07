import { db } from "@/db";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { schema } from "@/db";
import Link from "next/link";
import { Filter, Search as SearchIcon } from "lucide-react";
import { ProductCard } from "@/components/catalog/product-card";

export const dynamic = "force-dynamic";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; format?: string; genre?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const format = params.format as "vinyl" | "cassette" | "cd" | undefined;
  const genre = params.genre ?? "";
  const page = parseInt(params.page ?? "1", 10);
  const perPage = 20;

  const d = db();

  // Build filters
  const whereConditions = [eq(schema.products.status, "active")];
  if (format) whereConditions.push(eq(schema.products.format, format));
  if (genre) whereConditions.push(eq(schema.products.genre, genre));
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
    limit: perPage + 1,
    offset: (page - 1) * perPage,
    orderBy: [desc(schema.products.createdAt)],
  });

  const hasMore = products.length > perPage;
  const pageProducts = products.slice(0, perPage);

  // Distinct genres/filters
  const allActive = await d.query.products.findMany({
    where: eq(schema.products.status, "active"),
    columns: { genre: true, format: true },
  });
  const genres = [...new Set(allActive.map((p) => p.genre))].sort();
  const formats = [...new Set(allActive.map((p) => p.format))].sort();

  function genHref(opts: { format?: string; genre?: string }) {
    const p = new URLSearchParams();
    if (opts.format) p.set("format", opts.format);
    if (opts.genre) p.set("genre", opts.genre);
    if (q) p.set("q", q);
    return `?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Catalog</h1>

      <div className="flex gap-6">
        {/* Filter sidebar */}
        <aside className="hidden w-56 flex-shrink-0 space-y-6 md:block">
          {/* Format filter */}
          <div className="card space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Filter className="h-4 w-4" /> Format
            </h2>
            <div className="space-y-2 text-sm">
              <Link href={`/catalog${genre ? `?genre=${genre}` : ""}`} className="block text-foreground hover:text-accent transition-colors">
                All
              </Link>
              {formats.map((f) => (
                <Link
                  key={f}
                  href={`/catalog${genHref({ format: f, genre })}`}
                  className={`block capitalize text-foreground hover:text-accent transition-colors ${format === f ? "!text-accent font-semibold" : ""}`}
                >
                  {f}
                </Link>
              ))}
            </div>
          </div>

          {/* Genre filter */}
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Genre</h2>
            <div className="space-y-2 text-sm">
              <Link href={`/catalog${format ? `?format=${format}` : ""}`} className="block text-foreground hover:text-accent transition-colors">
                All
              </Link>
              {genres.map((g) => (
                <Link
                  key={g}
                  href={`/catalog${genHref({ format, genre: g })}`}
                  className={`block text-foreground hover:text-accent transition-colors ${genre === g ? "!text-accent font-semibold" : ""}`}
                >
                  {g}
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
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {pageProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {hasMore && (
                <div className="mt-6 flex justify-center">
                  <Link href={`/catalog${genHref({ format, genre })}&page=${page + 1}`} className="btn-secondary">
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
    </div>
  );
}
