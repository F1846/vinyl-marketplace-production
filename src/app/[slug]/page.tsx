import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/catalog/product-card";
import { JsonLd } from "@/components/seo/json-ld";
import { getCatalogPage } from "@/lib/catalog";
import {
  getSeoLandingPage,
  seoLandingPageSlugs,
  type CollectionSeoLandingPage,
  type PickupSeoLandingPage,
} from "@/lib/seo-landing-pages";
import { pickupAddressLines, siteConfig, siteUrl } from "@/lib/site";

export const revalidate = 3600;
export const dynamicParams = false;

function getMetadataForPage(
  page: CollectionSeoLandingPage | PickupSeoLandingPage,
): Metadata {
  const canonical = siteUrl(`/${page.slug}`);

  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${page.title} | ${siteConfig.name}`,
      description: page.description,
      url: canonical,
      siteName: siteConfig.name,
    },
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getSeoLandingPage(slug);

  if (!page) {
    return {
      title: "Page not found",
      robots: { index: false, follow: false },
    };
  }

  return getMetadataForPage(page);
}

export function generateStaticParams() {
  return seoLandingPageSlugs;
}

function buildCollectionStructuredData(
  page: CollectionSeoLandingPage,
  products: Awaited<ReturnType<typeof getCatalogPage>>["products"],
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: page.title,
    url: siteUrl(`/${page.slug}`),
    description: page.description,
    mainEntity: {
      "@type": "ItemList",
      name: page.collectionLabel,
      numberOfItems: products.length,
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: siteUrl(`/products/${product.id}`),
        name: `${product.artist} - ${product.title}`,
      })),
    },
  };
}

function buildPickupStructuredData(page: PickupSeoLandingPage) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: page.title,
      url: siteUrl(`/${page.slug}`),
      description: page.description,
      about: {
        "@type": "MusicStore",
        name: siteConfig.name,
        url: siteConfig.baseUrl,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ];
}

function buildBreadcrumbStructuredData(pageTitle: string, slug: string) {
  return {
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
        name: pageTitle,
        item: siteUrl(`/${slug}`),
      },
    ],
  };
}

export default async function SeoLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getSeoLandingPage(slug);

  if (!page) {
    notFound();
  }

  const catalog = await getCatalogPage(
    page.kind === "collection"
      ? { ...page.query, limit: 8, offset: 0, sort: "newest" }
      : { limit: 8, offset: 0, sort: "newest" },
  );

  const collectionStructuredData =
    page.kind === "collection" ? buildCollectionStructuredData(page, catalog.products) : null;
  const pickupStructuredData =
    page.kind === "pickup" ? buildPickupStructuredData(page) : null;
  const breadcrumbStructuredData = buildBreadcrumbStructuredData(page.title, page.slug);

  return (
    <div className="space-y-8">
      {collectionStructuredData && <JsonLd data={collectionStructuredData} />}
      {pickupStructuredData?.map((item, index) => <JsonLd key={index} data={item} />)}
      <JsonLd data={breadcrumbStructuredData} />

      <section className="grid gap-4 overflow-hidden rounded-[1.35rem] border border-border bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(243,242,238,0.95))] px-4 py-6 shadow-card sm:px-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.82fr)] lg:px-6 lg:py-7">
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            {page.eyebrow}
          </p>
          <div className="space-y-3">
            <h1 className="max-w-[12ch] text-balance font-sans text-[clamp(2.7rem,6vw,4.6rem)] font-bold leading-[0.92] tracking-[-0.05em] text-foreground">
              {page.heading}
            </h1>
            <p className="max-w-2xl text-[15px] leading-7 text-muted">
              {page.description}
            </p>
            <p className="max-w-2xl text-sm leading-7 text-muted">
              {page.intro}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={page.ctaHref} className="btn-primary">
              {page.ctaLabel}
            </Link>
            <Link href="/catalog" className="btn-secondary">
              Browse full catalog
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1rem] border border-border bg-white p-3.5 shadow-card">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Live listings</p>
              <p className="mt-1 font-sans text-[1.5rem] font-bold tracking-[-0.04em] text-foreground">
                {catalog.totalCount}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Real stock from the active Federico Shop catalog.
              </p>
            </div>
            <div className="rounded-[1rem] border border-border bg-white p-3.5 shadow-card">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Why this page</p>
              <p className="mt-2 text-sm leading-6 text-muted">{page.body}</p>
            </div>
            <div className="rounded-[1rem] border border-border bg-white p-3.5 shadow-card">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted">
                {page.kind === "pickup" ? "Pickup area" : "Collector flow"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                {page.kind === "pickup"
                  ? `${siteConfig.pickupLabel}. Confirmation is handled by email after checkout.`
                  : "Condition notes, euro pricing, and direct checkout from the live catalog."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.2rem] border border-border bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Related pages
          </p>
          <div className="mt-3 space-y-3">
            {page.supportingLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-[0.95rem] border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground transition hover:border-foreground/20 hover:bg-surface-hover"
              >
                {link.label}
              </Link>
            ))}
          </div>
          {page.kind === "pickup" && (
            <div className="mt-5 rounded-[1rem] border border-border bg-background px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Pickup details</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                {pickupAddressLines().join("\n")}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Federico Shop picks
            </p>
            <h2 className="font-sans text-[1.9rem] font-bold tracking-[-0.04em] text-foreground">
              {page.productHeading}
            </h2>
          </div>
          <Link href={page.ctaHref} className="text-sm text-accent hover:underline">
            Open this section
          </Link>
        </div>

        {catalog.products.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {catalog.products.map((product) => (
              <ProductCard key={product.id} product={product} size="compact" />
            ))}
          </div>
        ) : (
          <div className="card text-center text-muted">
            <p>
              No active products are visible on this page yet. Use the live catalog to browse the
              full archive.
            </p>
          </div>
        )}
      </section>

      {page.kind === "pickup" && (
        <section className="grid gap-4 lg:grid-cols-3">
          {page.faqs.map((faq) => (
            <div
              key={faq.question}
              className="rounded-[1.1rem] border border-border bg-white p-4 shadow-card"
            >
              <h2 className="font-sans text-[1.15rem] font-bold tracking-[-0.04em] text-foreground">
                {faq.question}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">{faq.answer}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
