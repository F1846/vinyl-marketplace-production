import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { AddToCart } from "@/components/product/add-to-cart";
import { ProductImageGallery } from "@/components/product/product-image-gallery";
import { formatEuroFromCents } from "@/lib/money";
import { siteUrl } from "@/lib/site";
import { conditionLabel } from "@/types/product";

export const dynamic = "force-dynamic";

async function getProduct(id: string) {
  const d = db();
  return d.query.products.findFirst({
    where: eq(schema.products.id, id),
    with: { images: { orderBy: [schema.productImages.sortOrder] } },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product || product.status === "archived") {
    return {
      title: "Record not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${product.artist} - ${product.title}`;
  const description =
    product.description?.trim() ||
    `${product.format.toUpperCase()} / ${product.genre} / ${formatEuroFromCents(product.priceCents)}`;
  const imageUrl = product.images[0]?.url;

  return {
    title,
    description,
    alternates: {
      canonical: siteUrl(`/products/${product.id}`),
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: siteUrl(`/products/${product.id}`),
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product || product.status === "archived") {
    notFound();
  }

  const inStock = product.stockQuantity > 0;
  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${product.artist} - ${product.title}`,
    description:
      product.description?.trim() ||
      `${product.format.toUpperCase()} / ${product.genre} / ${formatEuroFromCents(product.priceCents)}`,
    image: product.images.map((image) => image.url),
    sku: product.pressingCatalogNumber || product.id,
    category: [product.genre, product.format].filter(Boolean).join(" / "),
    brand: product.pressingLabel
      ? {
          "@type": "Brand",
          name: product.pressingLabel,
        }
      : undefined,
    offers: {
      "@type": "Offer",
      url: siteUrl(`/products/${product.id}`),
      priceCurrency: "EUR",
      price: (product.priceCents / 100).toFixed(2),
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition:
        product.conditionMedia === "M"
          ? "https://schema.org/NewCondition"
          : "https://schema.org/UsedCondition",
      seller: {
        "@type": "Organization",
        name: "Federico Shop",
      },
    },
  };

  return (
    <div className="mx-auto max-w-5xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productStructuredData) }}
      />
      <div className="grid gap-5 lg:grid-cols-[0.84fr_1.06fr] lg:items-start">
        <div className="lg:max-w-[24.5rem]">
          <ProductImageGallery
            images={product.images}
            artist={product.artist}
            title={product.title}
          />
        </div>

        <div className="space-y-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge badge-${product.format} capitalize`}>{product.format}</span>
            {product.conditionMedia && (
              <span className="rounded-full border border-border bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-muted">
                Media:{" "}
                <span className="text-foreground">
                  {conditionLabel(product.conditionMedia)}
                </span>
              </span>
            )}
            {product.conditionSleeve && (
              <span className="rounded-full border border-border bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-muted">
                Sleeve:{" "}
                <span className="text-foreground">
                  {conditionLabel(product.conditionSleeve)}
                </span>
              </span>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
              {product.artist}
            </p>
            <h1 className="max-w-[15ch] font-sans text-[1.85rem] font-bold leading-[0.98] tracking-[-0.04em] text-foreground sm:text-[2.2rem]">
              {product.title}
            </h1>
          </div>

          <div className="grid gap-3 rounded-[1.15rem] border border-border bg-white p-3.5 shadow-soft sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Price
              </p>
              <p className="mt-1 font-sans text-[1.55rem] font-bold leading-none tracking-[-0.04em] text-foreground">
                {formatEuroFromCents(product.priceCents)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Availability
              </p>
              <p
                className={`mt-1 text-sm font-medium ${inStock ? "text-success" : "text-danger"}`}
              >
                {inStock ? `${product.stockQuantity} in stock` : "Sold out"}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {product.pressingLabel && (
              <div className="rounded-[0.95rem] border border-border bg-background px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Label
                </p>
                <p className="mt-1 text-sm text-foreground">{product.pressingLabel}</p>
              </div>
            )}
            {product.pressingCatalogNumber && (
              <div className="rounded-[0.95rem] border border-border bg-background px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Cat#
                </p>
                <p className="mt-1 font-mono text-sm text-foreground">
                  {product.pressingCatalogNumber}
                </p>
              </div>
            )}
            {product.pressingYear && (
              <div className="rounded-[0.95rem] border border-border bg-background px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Year
                </p>
                <p className="mt-1 text-sm text-foreground">{product.pressingYear}</p>
              </div>
            )}
            {product.genre && (
              <div className="rounded-[0.95rem] border border-border bg-background px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Genre
                </p>
                <p className="mt-1 text-sm text-foreground">{product.genre}</p>
              </div>
            )}
          </div>

          <div className="rounded-[1.15rem] border border-border bg-white p-3.5 shadow-soft">
            <div className="space-y-3">
              <p className="text-sm leading-6 text-muted">
                Packed carefully for collectors. Shipping and pickup options are calculated
                in checkout, and all prices are shown in euro.
              </p>
              {inStock ? (
                <AddToCart product={product} imageUrl={product.images[0]?.url ?? undefined} />
              ) : (
                <button className="btn-secondary w-full" disabled>
                  Sold Out
                </button>
              )}
            </div>
          </div>

          {product.description && (
            <section className="rounded-[1.1rem] border border-border bg-white p-3.5 shadow-soft">
              <h2 className="font-sans text-[1.15rem] font-bold tracking-[-0.04em] text-foreground">
                Release notes
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">
                {product.description}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
