import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Disc as RecordIcon,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { db, schema } from "@/db";
import { asc, desc, eq, sql } from "drizzle-orm";
import { ProductCard } from "@/components/catalog/product-card";
import { formatEuroFromCents } from "@/lib/money";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

function shuffleProducts<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export default async function HomePage() {
  const d = db();
  const latestProducts = await d.query.products.findMany({
    where: eq(schema.products.status, "active"),
    orderBy: [desc(schema.products.createdAt)],
    limit: 50,
    with: { images: { orderBy: [schema.productImages.sortOrder] } },
  });
  const heroPreviewProducts = await d.query.products.findMany({
    where: eq(schema.products.status, "active"),
    orderBy: [sql`random()`],
    limit: 4,
    with: { images: { orderBy: [schema.productImages.sortOrder] } },
  });
  const [{ count, minPrice }] = await d
    .select({
      count: sql<number>`count(*)`,
      minPrice: sql<number | null>`min(${schema.products.priceCents})`,
    })
    .from(schema.products)
    .where(eq(schema.products.status, "active"));

  const cheapestProduct = await d.query.products.findFirst({
    where: eq(schema.products.status, "active"),
    orderBy: [asc(schema.products.priceCents), asc(schema.products.artist), asc(schema.products.title)],
    with: { images: { orderBy: [schema.productImages.sortOrder] } },
  });
  const shuffledLatestProducts = shuffleProducts(latestProducts);
  const newArrivalProducts = shuffleProducts(shuffledLatestProducts).slice(0, 12);
  const shelfPicks = shuffledLatestProducts.slice(12, 20);
  const heroSupportProducts = shuffledLatestProducts.slice(0, 3);
  const featuredHeroProduct = heroPreviewProducts[0] ?? latestProducts[0] ?? null;
  const formatSpotlight = heroPreviewProducts[1] ?? latestProducts[1] ?? null;
  const storefrontStructuredData = {
    "@context": "https://schema.org",
    "@type": "MusicStore",
    name: siteConfig.name,
    url: siteConfig.baseUrl,
    description: siteConfig.description,
    areaServed: "Europe",
    paymentAccepted: ["PayPal", "Credit Card", "Local Pickup"],
  };

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storefrontStructuredData) }}
      />

      <section className="grid gap-4 overflow-hidden rounded-[1.25rem] border border-border bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(243,242,238,0.95))] px-4 py-5 shadow-card sm:px-5 lg:grid-cols-[minmax(0,1.06fr)_minmax(270px,0.78fr)] lg:px-6 lg:py-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
            <RecordIcon className="h-3 w-3 text-foreground" />
            Independent record store
          </div>
          <div className="space-y-2.5">
            <h1 className="max-w-[10.5ch] text-balance font-sans text-[clamp(2.85rem,6.2vw,4.95rem)] font-bold leading-[0.92] tracking-[-0.05em] text-foreground">
              Records worth having on the shelf.
            </h1>
            <p className="max-w-xl text-[14px] leading-6 text-muted">
              {siteConfig.name} is an electronic music record shop with graded vinyl,
              cassette, and CD finds, fair euro pricing, and collector-friendly shipping.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/catalog" className="btn-primary">
              Browse the catalog <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/shipping" className="btn-secondary">
              Shipping and pickup
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Link
              href={featuredHeroProduct ? `/products/${featuredHeroProduct.id}` : "/catalog"}
              className="group rounded-[0.9rem] border border-border bg-white p-2.25 shadow-card transition hover:-translate-y-0.5 hover:border-foreground/15"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Available now</p>
              <p className="mt-1 font-sans text-[1.35rem] font-bold leading-none tracking-[-0.04em] text-foreground">
                {count ?? 0}
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted">
                {featuredHeroProduct
                  ? `${featuredHeroProduct.artist} - ${featuredHeroProduct.title}`
                  : "Current records, tapes, and CDs ready to open and play."}
              </p>
            </Link>
            <Link
              href={cheapestProduct ? `/products/${cheapestProduct.id}` : "/catalog?sort=price-asc"}
              className="group rounded-[0.9rem] border border-border bg-white p-2.25 shadow-card transition hover:-translate-y-0.5 hover:border-foreground/15"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted">From</p>
              <p className="mt-1 font-sans text-[1.35rem] font-bold leading-none tracking-[-0.04em] text-foreground">
                {minPrice === null ? "0 EUR" : formatEuroFromCents(minPrice)}
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted">
                {cheapestProduct
                  ? `Start with ${cheapestProduct.artist} - ${cheapestProduct.title}`
                  : "Start with the lowest-priced copy currently in the catalog."}
              </p>
            </Link>
            <Link
              href={
                formatSpotlight
                  ? `/catalog?format=${encodeURIComponent(formatSpotlight.format)}`
                  : "/catalog"
              }
              className="group rounded-[0.9rem] border border-border bg-white p-2.25 shadow-card transition hover:-translate-y-0.5 hover:border-foreground/15"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Format mix</p>
              <p className="mt-1 font-sans text-[1.05rem] font-bold capitalize tracking-[-0.04em] text-foreground">
                Vinyl / Tape / CD
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted">
                {formatSpotlight
                  ? `${formatSpotlight.artist} - ${formatSpotlight.title}`
                  : "Browse by format and jump straight into the shelf you want."}
              </p>
            </Link>
          </div>
          {heroSupportProducts.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-3">
              {heroSupportProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="flex items-center gap-2.5 rounded-[0.9rem] border border-border/90 bg-white px-2.5 py-2 shadow-card transition hover:-translate-y-0.5 hover:border-foreground/15"
                >
                  <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-[0.75rem] bg-[#ebe8e1]">
                    {product.images[0]?.url ? (
                      <Image
                        src={product.images[0].url}
                        alt={`${product.artist} - ${product.title}`}
                        fill
                        className="object-cover"
                        sizes="44px"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-muted">
                      {product.format}
                    </p>
                    <p className="line-clamp-1 font-sans text-[0.88rem] font-bold tracking-[-0.04em] text-foreground">
                      {product.artist}
                    </p>
                    <p className="line-clamp-1 text-[11px] text-muted">{product.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 justify-items-center sm:justify-items-stretch">
          {heroPreviewProducts.map((product) => (
            <div key={product.id} className="w-full max-w-[156px]">
              <ProductCard product={product} size="compact" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="mb-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Fresh in
            </p>
            <h2 className="font-sans text-[1.8rem] font-bold tracking-[-0.04em] text-foreground">
              New arrivals
            </h2>
          </div>
          <Link href="/catalog" className="text-sm text-accent hover:underline">
            View all <ArrowRight className="inline h-4 w-4" />
          </Link>
        </div>
        {newArrivalProducts.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {newArrivalProducts.map((product) => (
              <div key={product.id} className="w-[146px] flex-none sm:w-[152px] lg:w-[156px]">
                <ProductCard product={product} size="compact" />
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center text-muted">
            <p>Catalog is empty. Check back soon.</p>
          </div>
        )}
      </section>

      {shelfPicks.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Shelf picks
              </p>
              <h2 className="font-sans text-[1.8rem] font-bold tracking-[-0.04em] text-foreground">
                More from the racks
              </h2>
            </div>
            <Link href="/catalog" className="text-sm text-accent hover:underline">
              Explore more <ArrowRight className="inline h-4 w-4" />
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {shelfPicks.map((product) => (
              <div key={product.id} className="w-[146px] flex-none sm:w-[152px] lg:w-[156px]">
                <ProductCard product={product} size="compact" />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: Check,
            title: "Collector-minded grading",
            desc: "Detailed condition notes, format labels, and shelf-ready listings.",
          },
          {
            icon: ShieldCheck,
            title: "Flexible checkout",
            desc: "Use card checkout, PayPal, or reserve for local pickup.",
          },
          {
            icon: Truck,
            title: "Shipping by format",
            desc: "Rates adjust by country, quantity, and media format instead of one flat fee.",
          },
        ].map((feature) => (
          <div key={feature.title} className="rounded-[1.1rem] border border-border/90 bg-surface p-3.5 shadow-card">
            <feature.icon className="h-4.5 w-4.5 text-foreground" />
            <h3 className="mt-2.5 font-sans text-[1.25rem] font-bold tracking-[-0.04em] text-foreground">
              {feature.title}
            </h3>
            <p className="mt-1.5 text-[0.92rem] leading-6 text-muted">{feature.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
