import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { AddToCart } from "@/components/product/add-to-cart";
import { ProductImageGallery } from "@/components/product/product-image-gallery";
import { formatEuroFromCents } from "@/lib/money";
import { siteConfig } from "@/lib/site";
import { conditionLabel } from "@/types/product";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const d = db();
  const product = await d.query.products.findFirst({
    where: eq(schema.products.id, id),
    with: { images: { orderBy: [schema.productImages.sortOrder] } },
  });

  if (!product || product.status === "archived") {
    notFound();
  }

  const inStock = product.stockQuantity > 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <ProductImageGallery
        images={product.images}
        artist={product.artist}
        title={product.title}
      />

      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <span className={`badge badge-${product.format} capitalize`}>{product.format}</span>
          {product.conditionMedia && (
            <span className="text-sm text-muted">
              Media: <span className="text-foreground">{conditionLabel(product.conditionMedia)}</span>
            </span>
          )}
          {product.conditionSleeve && (
            <span className="text-sm text-muted">
              Sleeve: <span className="text-foreground">{conditionLabel(product.conditionSleeve)}</span>
            </span>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            {product.artist}
          </p>
          <h1 className="font-serif text-4xl text-foreground sm:text-5xl">
            {product.title}
          </h1>
        </div>

        <p className="text-3xl font-semibold text-foreground">
          {formatEuroFromCents(product.priceCents)}
        </p>

        {(product.pressingLabel || product.pressingYear || product.pressingCatalogNumber) && (
          <table className="w-full overflow-hidden rounded-[1.5rem] border border-border bg-white text-sm shadow-soft">
            <tbody>
              {product.pressingLabel && (
                <tr>
                  <td className="border-b border-border px-4 py-3 text-muted">Label</td>
                  <td className="border-b border-border px-4 py-3 text-foreground">{product.pressingLabel}</td>
                </tr>
              )}
              {product.pressingCatalogNumber && (
                <tr>
                  <td className="border-b border-border px-4 py-3 text-muted">Cat#</td>
                  <td className="border-b border-border px-4 py-3 font-mono text-foreground">
                    {product.pressingCatalogNumber}
                  </td>
                </tr>
              )}
              {product.pressingYear && (
                <tr>
                  <td className="px-4 py-3 text-muted">Year</td>
                  <td className="px-4 py-3 text-foreground">{product.pressingYear}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {product.genre && (
          <p className="text-sm">
            <span className="text-muted">Genre: </span>
            <span className="text-foreground">{product.genre}</span>
          </p>
        )}

        {product.description && (
          <div className="card">
            <h2 className="font-serif text-2xl text-foreground">Release notes</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
              {product.description}
            </p>
          </div>
        )}

        <div className="card space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Availability</span>
            <span className={inStock ? "font-medium text-success" : "font-medium text-danger"}>
              {inStock ? `${product.stockQuantity} in stock` : "Sold out"}
            </span>
          </div>
          <p className="text-sm leading-7 text-muted">
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
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Pickup available: {siteConfig.pickupLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
