import Link from "next/link";
import { ProductWithImages } from "@/types/product";
import Image from "next/image";

function formatBadge(format: string) {
  const classes: Record<string, string> = {
    vinyl: "badge-vinyl",
    cassette: "badge-cassette",
    cd: "badge-cd",
  };
  return <span className={classes[format] || "badge"}>{format}</span>;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface ProductCardProps {
  product: ProductWithImages;
}

export function ProductCard({ product }: ProductCardProps) {
  const imageUrl = product.images[0]?.url ?? null;

  return (
    <Link href={`/products/${product.id}`} className="group card border-border bg-surface p-0 transition-shadow hover:shadow-[0_0_12px_rgba(212,168,67,0.15)]">
      <div className="relative aspect-square overflow-hidden bg-zinc-800">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${product.artist} - ${product.title}`}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">No image</div>
        )}
        {product.stockQuantity === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="badge-sold font-semibold">Sold Out</span>
          </div>
        )}
        <div className="absolute top-2 left-2">{formatBadge(product.format)}</div>
      </div>
      <div className="p-3">
        <p className="text-sm text-muted">{product.artist}</p>
        <p className="text-sm font-medium text-foreground">{product.title}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-lg font-bold text-accent">{formatPrice(product.priceCents)}</span>
          {product.conditionMedia && (
            <span className="text-xs text-muted border border-border px-2 py-0.5 rounded">
              {product.conditionMedia}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
