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
  const imageSizes = compact
    ? "(max-width: 640px) 42vw, (max-width: 1024px) 22vw, 14vw"
    : "(max-width: 640px) 44vw, (max-width: 1024px) 28vw, 18vw";

  return (
    <Link
      href={`/products/${product.id}`}
      className="group block overflow-hidden rounded-[1.05rem] border border-border/90 bg-surface shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-foreground/15"
    >
      <div
        className={`relative overflow-hidden bg-[#ebe8e1] ${
          compact ? "aspect-[0.88]" : "aspect-[0.9]"
        }`}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${product.artist} - ${product.title}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes={imageSizes}
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
        <div className="absolute left-2.5 top-2.5">{formatBadge(product.format)}</div>
      </div>
      <div className={compact ? "p-3" : "p-3.5"}>
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">
          {product.artist}
        </p>
        <p
          className={`mt-1.5 line-clamp-2 font-serif leading-tight text-foreground ${
            compact ? "min-h-[2.3rem] text-[0.95rem]" : "min-h-[2.45rem] text-[0.98rem]"
          }`}
        >
          {product.title}
        </p>
        <div className="mt-2.5 flex items-center justify-between gap-2.5">
          <span
            className={
              compact
                ? "text-[0.95rem] font-semibold text-foreground"
                : "text-[0.98rem] font-semibold text-foreground"
            }
          >
            {formatEuroFromCents(product.priceCents)}
          </span>
          {product.conditionMedia && (
            <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted">
              {product.conditionMedia}
            </span>
          )}
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.17em] text-muted">
          <span className="line-clamp-1">{product.genre}</span>
          <span>
            {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : "Unavailable"}
          </span>
        </div>
      </div>
    </Link>
  );
}
