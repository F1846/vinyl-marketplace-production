import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Image from "next/image";
import { conditionLabel } from "@/types/product";
import { AddToCart } from "@/components/product/add-to-cart";
import { formatEuroFromCents } from "@/lib/money";

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
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Image gallery */}
      <div>
        <div className="relative aspect-square overflow-hidden rounded-lg bg-surface">
          {product.images[0]?.url ? (
            <Image
              src={product.images[0].url}
              alt={`${product.artist} - ${product.title}`}
              fill
              className="object-cover"
              sizes="50vw"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted text-lg">
              No image available
            </div>
          )}
        </div>
        {product.images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {product.images.map((img) => (
              <div
                key={img.id}
                className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded border border-border cursor-pointer"
              >
                <Image src={img.url} alt="" fill className="object-cover" sizes="5rem" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product details - Discogs-style */}
      <div className="space-y-4">
        {/* Format badge + condition */}
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

        <h1 className="text-3xl font-bold text-foreground">
          {product.artist} — {product.title}
        </h1>

        {/* Price */}
        <p className="text-3xl font-bold text-accent">
          {formatEuroFromCents(product.priceCents)}
        </p>

        {/* Pressing info - Discogs-style table */}
        {(product.pressingLabel || product.pressingYear || product.pressingCatalogNumber) && (
          <table className="w-full text-sm">
            <tbody>
              {product.pressingLabel && (
                <tr>
                  <td className="text-muted py-1">Label</td>
                  <td className="text-foreground py-1">{product.pressingLabel}</td>
                </tr>
              )}
              {product.pressingCatalogNumber && (
                <tr>
                  <td className="text-muted py-1">Cat#</td>
                  <td className="text-foreground py-1 font-mono">{product.pressingCatalogNumber}</td>
                </tr>
              )}
              {product.pressingYear && (
                <tr>
                  <td className="text-muted py-1">Year</td>
                  <td className="text-foreground py-1">{product.pressingYear}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Genre */}
        {product.genre && (
          <p className="text-sm">
            <span className="text-muted">Genre: </span>
            <span className="text-foreground">{product.genre}</span>
          </p>
        )}

        {/* Description */}
        {product.description && (
          <p className="text-sm text-muted whitespace-pre-wrap">{product.description}</p>
        )}

        {/* Stock + Add to cart */}
        <div className="pt-4">
          {inStock ? (
            <>
              <p className="mb-2 text-sm text-success">{product.stockQuantity} in stock</p>
              <AddToCart product={product} imageUrl={product.images[0]?.url ?? undefined} />
            </>
          ) : (
            <button className="btn-secondary w-full" disabled>
              Sold Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
