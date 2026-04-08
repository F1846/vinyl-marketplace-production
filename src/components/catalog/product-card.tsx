import Link from "next/link";
import Image from "next/image";
import { formatEuroFromCents } from "@/lib/money";

type ProductCardProduct = {
  id: string;
  artist: string;
  title: string;
  format: string;
  genre: string;
  priceCents: number;
  stockQuantity: number;
  conditionMedia: string | null;
  images: Array<{
    id: string;
    url: string;
    sortOrder: number;
  }>;
};

function formatBadge(format: string) {
  const classes: Record<string, string> = {
    vinyl: "badge-vinyl",
    cassette: "badge-cassette",
    cd: "badge-cd",
  };
  return <span className={classes[format] || "badge"}>{format}</span>;
}

interface ProductCardProps {
  product: ProductCardProduct;
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const imageUrl = product.images[0]?.url ?? null;

  return (
    <Link
      href={`/products/${product.id}`}
      className="group block overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-soft transition duration-300 hover:-translate-y-1 hover:border-foreground/15"
    >
      <div className="relative aspect-square overflow-hidden bg-[#ebe8e1]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${product.artist} - ${product.title}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            No image
          </div>
        )}
        {product.stockQuantity === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <span className="badge-sold font-semibold">Sold out</span>
          </div>
        )}
        <div className="absolute left-3 top-3">{formatBadge(product.format)}</div>
      </div>
      <div className={compact ? "p-4" : "p-5"}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {product.artist}
        </p>
        <p className="mt-2 min-h-[3rem] font-serif text-xl leading-tight text-foreground">
          {product.title}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-lg font-semibold text-foreground">
            {formatEuroFromCents(product.priceCents)}
          </span>
          {product.conditionMedia && (
            <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
              {product.conditionMedia}
            </span>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted">
          <span>{product.genre}</span>
          <span>
            {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : "Unavailable"}
          </span>
        </div>
      </div>
    </Link>
  );
}
