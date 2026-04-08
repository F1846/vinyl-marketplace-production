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
  size?: "default" | "compact" | "mini";
}

export function ProductCard({ product, size = "default" }: ProductCardProps) {
  const imageUrl = product.images[0]?.url ?? null;
  const isMini = size === "mini";
  const isCompact = size === "compact" || isMini;
  const imageSizes = isMini
    ? "(max-width: 640px) 34vw, (max-width: 1024px) 18vw, 10vw"
    : isCompact
      ? "(max-width: 640px) 35vw, (max-width: 1024px) 19vw, 11vw"
      : "(max-width: 640px) 38vw, (max-width: 1024px) 22vw, 13vw";
  const imageAspect = isMini ? "aspect-[0.82]" : isCompact ? "aspect-[0.82]" : "aspect-[0.84]";
  const paddingClass = isMini ? "p-2.5" : isCompact ? "p-2.5" : "p-3";
  const artistClass = isMini
    ? "text-[8px] font-semibold uppercase tracking-[0.18em] text-muted"
    : isCompact
      ? "text-[8px] font-semibold uppercase tracking-[0.18em] text-muted"
      : "text-[9px] font-semibold uppercase tracking-[0.18em] text-muted";
  const titleClass = isMini
    ? "min-h-[1.95rem] text-[0.84rem]"
    : isCompact
      ? "min-h-[1.95rem] text-[0.84rem]"
      : "min-h-[2.1rem] text-[0.9rem]";
  const priceClass = isMini
    ? "text-[0.84rem] font-semibold text-foreground"
    : isCompact
      ? "text-[0.84rem] font-semibold text-foreground"
      : "text-[0.9rem] font-semibold text-foreground";
  const metaClass = isMini
    ? "mt-2 flex items-center justify-between gap-2 text-[8px] uppercase tracking-[0.16em] text-muted"
    : isCompact
      ? "mt-2 flex items-center justify-between gap-2 text-[8px] uppercase tracking-[0.16em] text-muted"
      : "mt-2.5 flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.17em] text-muted";

  return (
    <Link
      href={`/products/${product.id}`}
      className="group block overflow-hidden rounded-[0.95rem] border border-border/90 bg-surface shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-foreground/15"
    >
      <div className={`relative overflow-hidden bg-[#ebe8e1] ${imageAspect}`}>
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
        <div className="absolute left-2 top-2">{formatBadge(product.format)}</div>
      </div>
      <div className={paddingClass}>
        <p className={artistClass}>{product.artist}</p>
        <p
          className={`mt-1.5 line-clamp-2 font-sans font-bold leading-tight tracking-[-0.04em] text-foreground ${titleClass}`}
        >
          {product.title}
        </p>
        <div className="mt-2.5 flex items-center justify-between gap-2.5">
          <span className={priceClass}>{formatEuroFromCents(product.priceCents)}</span>
          {product.conditionMedia && (
            <span className="rounded-full border border-border px-2 py-[0.28rem] text-[8px] font-medium text-muted">
              {product.conditionMedia}
            </span>
          )}
        </div>
        <div className={metaClass}>
          <span className="line-clamp-1">{product.genre}</span>
          <span>
            {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : "Unavailable"}
          </span>
        </div>
      </div>
    </Link>
  );
}
