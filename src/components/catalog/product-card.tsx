"use client";

import Link from "next/link";
import Image from "next/image";
import { useDictionary } from "@/components/providers/locale-provider";
import { formatMessage } from "@/lib/i18n/format";
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
  const dictionary = useDictionary();
  const imageUrl = product.images[0]?.url ?? null;
  const isMini = size === "mini";
  const isCompact = size === "compact" || isMini;
  const imageSizes = isMini
    ? "(max-width: 640px) 38vw, (max-width: 1024px) 20vw, 12vw"
    : isCompact
      ? "(max-width: 640px) 40vw, (max-width: 1024px) 22vw, 14vw"
      : "(max-width: 640px) 44vw, (max-width: 1024px) 26vw, 17vw";
  const imageAspect = isMini ? "aspect-[0.82]" : isCompact ? "aspect-[0.88]" : "aspect-[0.9]";
  const paddingClass = isMini ? "p-2.5" : isCompact ? "p-3" : "p-[0.8125rem]";
  const bodyClass = isMini
    ? "grid h-full grid-rows-[1.55rem_2rem_1fr_auto]"
    : isCompact
      ? "grid h-full grid-rows-[2.05rem_2.15rem_1fr_auto]"
      : "grid h-full grid-rows-[2.05rem_2.35rem_1fr_auto]";
  const artistClass = isMini
    ? "h-[1.55rem] text-[8px] font-semibold uppercase tracking-[0.18em] text-muted"
    : "h-[2.05rem] text-[9px] font-semibold uppercase tracking-[0.18em] text-muted";
  const titleClass = isMini
    ? "h-[2rem] text-[0.88rem]"
    : isCompact
      ? "h-[2.15rem] text-[0.92rem]"
      : "h-[2.35rem] text-[0.96rem]";
  const priceClass = isMini
    ? "text-[0.88rem] font-semibold text-foreground"
    : isCompact
      ? "text-[0.92rem] font-semibold text-foreground"
      : "text-[0.96rem] font-semibold text-foreground";
  const metaClass = isMini
    ? "mt-2 grid min-h-[1rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 text-[8px] uppercase tracking-[0.16em] text-muted"
    : "mt-2.5 grid min-h-[1.05rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 text-[9px] uppercase tracking-[0.17em] text-muted";

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-[1rem] border border-border/90 bg-surface shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-foreground/15"
    >
      <div className={`relative overflow-hidden bg-[#ebe8e1] ${imageAspect}`}>
        {imageUrl ? (
          <div className="absolute inset-[5%]">
            <Image
              src={imageUrl}
              alt={`${product.artist} - ${product.title}`}
              fill
              className="object-contain transition-transform duration-500 group-hover:scale-[1.02]"
              sizes={imageSizes}
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            {dictionary.common.noImage}
          </div>
        )}
        {product.stockQuantity === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <span className="badge-sold font-semibold">{dictionary.productCard.soldOut}</span>
          </div>
        )}
        <div className="absolute left-2.5 top-2.5">{formatBadge(product.format)}</div>
      </div>
      <div className={`${paddingClass} ${bodyClass}`}>
        <p className={`${artistClass} line-clamp-2`}>{product.artist}</p>
        <p
          className={`mt-1.5 line-clamp-2 font-sans font-bold leading-tight tracking-[-0.04em] text-foreground ${titleClass}`}
        >
          {product.title}
        </p>
        <div />
        <div className="pt-2.5">
          <div className="flex items-center justify-between gap-2.5">
            <span className={priceClass}>{formatEuroFromCents(product.priceCents)}</span>
            {product.conditionMedia && (
              <span className="rounded-full border border-border px-2 py-1 text-[9px] font-medium text-muted">
                {product.conditionMedia}
              </span>
            )}
          </div>
          <div className={metaClass}>
            <span className="line-clamp-1">{product.genre}</span>
            <span className="whitespace-nowrap text-right">
              {product.stockQuantity > 0
                ? formatMessage(dictionary.productCard.inStock, { count: product.stockQuantity })
                : dictionary.productCard.unavailable}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
