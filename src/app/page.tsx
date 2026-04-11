import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Check,
  Disc as RecordIcon,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { db, schema } from "@/db";
import { and, asc, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { ProductCard } from "@/components/catalog/product-card";
import { formatMessage } from "@/lib/i18n/format";
import { getRequestDictionary } from "@/lib/i18n/server";
import { formatEuroFromCents } from "@/lib/money";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildCatalogPath,
  catalogFormatCollections,
  catalogGenreCollections,
  siteConfig,
} from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Federico Shop | Berlin Vinyl, Techno, EBM, Darkwave & Post-Punk Records",
  description:
    "Federico Shop is a Berlin-based online record shop for graded vinyl, cassette, and CD: techno, EBM, darkwave, post-punk, and collector-focused used records.",
  keywords: [
    "Federico Shop",
    "Federico",
    "Federico Shop vinyl",
    "Berlin online record shop",
    "Berlin vinyl shop",
    "techno vinyl Berlin",
    "EBM records",
    "darkwave vinyl",
    "post-punk records",
    "used vinyl Berlin",
    "vinyl cassette CD shop",
  ],
  alternates: {
    canonical: siteConfig.baseUrl,
  },
};

function shuffleProducts<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export default async function HomePage() {
  const dictionary = await getRequestDictionary();
  const d = db();
  const latestProducts = await d.query.products.findMany({
    where: and(
      eq(schema.products.status, "active"),
      gt(schema.products.stockQuantity, 0),
      isNull(schema.products.deletedAt)
    ),
    orderBy: [desc(schema.products.createdAt)],
    limit: 50,
    with: { images: { orderBy: [schema.productImages.sortOrder] } },
  });
  const heroPreviewProducts = await d.query.products.findMany({
    where: and(
      eq(schema.products.status, "active"),
      gt(schema.products.stockQuantity, 0),
      isNull(schema.products.deletedAt)
    ),
    orderBy: [sql`random()`],
    limit: 4,
    with: { images: { orderBy: [schema.productImages.sortOrder] } },
  });
  const [{ count, minPrice }] = await d
    .select({
      count: sql<number>`coalesce(sum(${schema.products.stockQuantity}), 0)`,
      minPrice: sql<number | null>`min(${schema.products.priceCents})`,
    })
    .from(schema.products)
    .where(
      and(
        eq(schema.products.status, "active"),
        gt(schema.products.stockQuantity, 0),
        isNull(schema.products.deletedAt)
      )
    );

  const cheapestProduct = await d.query.products.findFirst({
    where: and(
      eq(schema.products.status, "active"),
      gt(schema.products.stockQuantity, 0),
      isNull(schema.products.deletedAt)
    ),
    orderBy: [asc(schema.products.priceCents), asc(schema.products.artist), asc(schema.products.title)],
    with: { images: { orderBy: [schema.productImages.sortOrder] } },
  });
  const shuffledLatestProducts = shuffleProducts(latestProducts);
  const newArrivalProducts = shuffleProducts(shuffledLatestProducts).slice(0, 12);
  const shelfPicks = shuffledLatestProducts.slice(12, 20);
  const featureStripProducts = shuffledLatestProducts.slice(20, 23);
  const visibleGenreCollections = catalogGenreCollections
    .filter((collection) =>
      latestProducts.some((product) => product.genre.toLowerCase() === collection.genre.toLowerCase())
    )
    .slice(0, 6);
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
  const newArrivalsStructuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "New arrivals at Federico Shop",
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: newArrivalProducts.length,
    itemListElement: newArrivalProducts.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: siteConfig.baseUrl + `/products/${product.id}`,
      name: `${product.artist} - ${product.title}`,
    })),
  };
  const homeFeatures = [
    {
      icon: Check,
      title: dictionary.home.featureGradingTitle,
      desc: dictionary.home.featureGradingBody,
    },
    {
      icon: ShieldCheck,
      title: dictionary.home.featureCheckoutTitle,
      desc: dictionary.home.featureCheckoutBody,
    },
    {
      icon: Truck,
      title: dictionary.home.featureShippingTitle,
      desc: dictionary.home.featureShippingBody,
    },
  ];

  return (
    <div className="space-y-10">
      <JsonLd data={storefrontStructuredData} />
      <JsonLd data={newArrivalsStructuredData} />

      <section className="grid gap-4 overflow-hidden rounded-[1.35rem] border border-border bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(243,242,238,0.95))] px-4 py-6 shadow-card sm:px-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.82fr)] lg:px-6 lg:py-7">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">
            <RecordIcon className="h-3.5 w-3.5 text-foreground" />
            {dictionary.home.independentRecordStore}
          </div>
          <div className="space-y-3">
            <h1 className="max-w-[10.5ch] text-balance font-sans text-[clamp(3.15rem,7vw,5.25rem)] font-bold leading-[0.91] tracking-[-0.05em] text-foreground">
              {dictionary.home.worthHaving}
            </h1>
            <p className="max-w-xl text-[15px] leading-7 text-muted">
              {dictionary.home.worthHavingBody}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/catalog" className="btn-primary">
              {dictionary.home.browseCatalog} <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/shipping" className="btn-secondary">
              {dictionary.home.shippingAndPickup}
            </Link>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <Link
              href={featuredHeroProduct ? `/products/${featuredHeroProduct.id}` : "/catalog"}
              className="group rounded-[0.95rem] border border-border bg-white p-2.5 shadow-card transition hover:-translate-y-0.5 hover:border-foreground/15"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted">{dictionary.home.availableNow}</p>
              <p className="mt-1.5 font-sans text-[1.55rem] font-bold leading-none tracking-[-0.04em] text-foreground">
                {count ?? 0}
              </p>
              <p className="mt-1.5 line-clamp-2 text-[12px] leading-5 text-muted">
                {featuredHeroProduct
                  ? `${featuredHeroProduct.artist} - ${featuredHeroProduct.title}`
                  : dictionary.home.currentFallback}
              </p>
            </Link>
            <Link
              href={cheapestProduct ? `/products/${cheapestProduct.id}` : "/catalog?sort=price-asc"}
              className="group rounded-[0.95rem] border border-border bg-white p-2.5 shadow-card transition hover:-translate-y-0.5 hover:border-foreground/15"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted">{dictionary.home.from}</p>
              <p className="mt-1.5 font-sans text-[1.55rem] font-bold leading-none tracking-[-0.04em] text-foreground">
                {minPrice === null ? "0 EUR" : formatEuroFromCents(minPrice)}
              </p>
              <p className="mt-1.5 line-clamp-2 text-[12px] leading-5 text-muted">
                {cheapestProduct
                  ? formatMessage(dictionary.home.startWith, {
                      product: `${cheapestProduct.artist} - ${cheapestProduct.title}`,
                    })
                  : dictionary.home.currentFallback}
              </p>
            </Link>
            <Link
              href={
                formatSpotlight
                  ? `/catalog?format=${encodeURIComponent(formatSpotlight.format)}`
                  : "/catalog"
              }
              className="group rounded-[0.95rem] border border-border bg-white p-2.5 shadow-card transition hover:-translate-y-0.5 hover:border-foreground/15"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted">{dictionary.home.formatMix}</p>
              <p className="mt-1.5 font-sans text-[1.22rem] font-bold capitalize tracking-[-0.04em] text-foreground">
                {dictionary.home.formatMixValue}
              </p>
              <p className="mt-1.5 line-clamp-2 text-[12px] leading-5 text-muted">
                {formatSpotlight
                  ? `${formatSpotlight.artist} - ${formatSpotlight.title}`
                  : dictionary.home.formatFallback}
              </p>
            </Link>
          </div>
      {featureStripProducts.length > 0 && (
            <div className="grid gap-2.5 sm:grid-cols-3">
              {featureStripProducts.map((product) => (
                <ProductCard key={product.id} product={product} size="compact" />
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {heroPreviewProducts.map((product) => (
            <ProductCard key={product.id} product={product} size="mini" />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.2rem] border border-border bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            {dictionary.home.shopByFormat}
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {catalogFormatCollections.map((collection) => (
              <Link
                key={collection.format}
                href={buildCatalogPath({ format: collection.format })}
                className="rounded-full border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition hover:border-foreground/20 hover:bg-surface-hover"
              >
                {collection.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-[1.2rem] border border-border bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            {dictionary.home.popularGenres}
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {visibleGenreCollections.map((collection) => (
              <Link
                key={collection.genre}
                href={buildCatalogPath({ genre: collection.genre })}
                className="rounded-full border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition hover:border-foreground/20 hover:bg-surface-hover"
              >
                {collection.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              {dictionary.home.freshIn}
            </p>
            <h2 className="font-sans text-[2rem] font-bold tracking-[-0.04em] text-foreground">
              {dictionary.home.newArrivals}
            </h2>
          </div>
          <Link href="/catalog" className="text-sm text-accent hover:underline">
            {dictionary.common.viewAll} <ArrowRight className="inline h-4 w-4" />
          </Link>
        </div>
        {newArrivalProducts.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {newArrivalProducts.map((product) => (
              <div key={product.id} className="w-[148px] flex-none sm:w-[156px] lg:w-[164px]">
                <ProductCard product={product} size="compact" />
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center text-muted">
            <p>{dictionary.home.catalogEmpty}</p>
          </div>
        )}
      </section>

      {shelfPicks.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              {dictionary.home.shelfPicks}
            </p>
            <h2 className="font-sans text-[1.85rem] font-bold tracking-[-0.04em] text-foreground">
              {dictionary.home.moreFromTheRacks}
            </h2>
          </div>
          <Link href="/catalog" className="text-sm text-accent hover:underline">
            {dictionary.home.exploreMore} <ArrowRight className="inline h-4 w-4" />
          </Link>
        </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {shelfPicks.map((product) => (
              <ProductCard key={product.id} product={product} size="compact" />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        {homeFeatures.map((feature) => (
          <div key={feature.title} className="rounded-[1.2rem] border border-border/90 bg-surface p-4 shadow-card">
            <feature.icon className="h-5 w-5 text-foreground" />
            <h3 className="mt-3 font-sans text-[1.45rem] font-bold tracking-[-0.04em] text-foreground">
              {feature.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">{feature.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
