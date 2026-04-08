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
    ? "(max-width: 640px) 38vw, (max-width: 1024px) 20vw, 12vw"
    : isCompact
      ? "(max-width: 640px) 40vw, (max-width: 1024px) 22vw, 14vw"
      : "(max-width: 640px) 44vw, (max-width: 1024px) 26vw, 17vw";
  const imageAspect = isMini ? "aspect-[0.82]" : isCompact ? "aspect-[0.85]" : "aspect-[0.88]";
  const paddingClass = isMini ? "p-2.5" : isCompact ? "p-3" : "p-[0.8125rem]";
  const artistClass = isMini
    ? "text-[8px] font-semibold uppercase tracking-[0.18em] text-muted"
    : "text-[9px] font-semibold uppercase tracking-[0.18em] text-muted";
  const titleClass = isMini
    ? "min-h-[2rem] text-[0.88rem]"
    : isCompact
      ? "min-h-[2.15rem] text-[0.92rem]"
      : "min-h-[2.35rem] text-[0.96rem]";
  const priceClass = isMini
    ? "text-[0.88rem] font-semibold text-foreground"
    : isCompact
      ? "text-[0.92rem] font-semibold text-foreground"
      : "text-[0.96rem] font-semibold text-foreground";
  const metaClass = isMini
    ? "mt-2 flex items-center justify-between gap-2 text-[8px] uppercase tracking-[0.16em] text-muted"
    : "mt-2.5 flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.17em] text-muted";

  return (
    <Link
      href={`/products/${product.id}`}
      className="group block overflow-hidden rounded-[1rem] border border-border/90 bg-surface shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-foreground/15"
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
        <div className="absolute left-2.5 top-2.5">{formatBadge(product.format)}</div>
      </div>
      <div className={paddingClass}>
        <p className={artistClass}>{product.artist}</p>
        <p
          className={`mt-1.5 line-clamp-2 font-serif leading-tight text-foreground ${titleClass}`}
        >
          {product.title}
        </p>
        <div className="mt-2.5 flex items-center justify-between gap-2.5">
          <span className={priceClass}>{formatEuroFromCents(product.priceCents)}</span>
          {product.conditionMedia && (
            <span className="rounded-full border border-border px-2 py-1 text-[9px] font-medium text-muted">
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
