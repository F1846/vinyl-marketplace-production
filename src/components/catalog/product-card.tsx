"use client";

import Link from "next/link";
import Image from "next/image";
import { useDictionary } from "@/components/providers/locale-provider";
import { formatMessage } from "@/lib/i18n/format";
import { formatEuroFromCents } from "@/lib/money";
import { getReservedQuantity, useCart } from "@/hooks/use-cart";

type ProductCardProduct = {
  id: string;
  artist: string;
  title: string;
  format: string;
  genre: string;
  priceCents: number;
  stockQuantity: number;
  conditionMedia: string | null;
  pressingLabel?: string | null;
  pressingCatalogNumber?: string | null;
  pressingYear?: number | null;
  images: Array<{
    id: string;
    url: string;
    sortOrder: number;
    displayZoom: number;
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
  const { items } = useCart();
  const firstImage = product.images[0] ?? null;
  const imageUrl = firstImage?.url ?? null;
  const imageInset = firstImage && firstImage.displayZoom < 1
    ? `${((1 - firstImage.displayZoom) / 2) * 100}%`
    : undefined;
  const reservedQuantity = getReservedQuantity(items, product.id);
  const availableStock = Math.max(product.stockQuantity - reservedQuantity, 0);
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
    ? "h-[2.1rem] text-[0.88rem] font-semibold uppercase tracking-[0.08em] text-muted"
    : isCompact
      ? "h-[2.2rem] text-[0.92rem] font-semibold uppercase tracking-[0.08em] text-muted"
      : "h-[2.35rem] text-[0.96rem] font-semibold uppercase tracking-[0.08em] text-muted";
  const titleClass = isMini
    ? "h-[2.3rem] text-[0.88rem]"
    : isCompact
      ? "h-[2.45rem] text-[0.92rem]"
      : "h-[2.6rem] text-[0.96rem]";
  const priceClass = isMini
    ? "text-[0.88rem] font-semibold text-foreground"
    : isCompact
      ? "text-[0.92rem] font-semibold text-foreground"
      : "text-[0.96rem] font-semibold text-foreground";
  const detailWrapperClass = isMini
    ? "mt-2.5 space-y-1.5 text-[0.66rem]"
    : isCompact
      ? "mt-2.5 space-y-1.5 text-[0.68rem]"
      : "mt-3 space-y-1.5 text-[0.7rem]";
  const detailValueClass = isMini
    ? "line-clamp-1 text-[0.72rem] font-medium text-foreground"
    : isCompact
      ? "line-clamp-1 text-[0.74rem] font-medium text-foreground"
      : "line-clamp-1 text-[0.76rem] font-medium text-foreground";
  const metaClass = isMini
    ? "mt-2 flex items-center justify-between gap-2 text-[8px] uppercase tracking-[0.16em] text-muted"
    : "mt-2.5 flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.17em] text-muted";

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-[1rem] border border-border/90 bg-surface shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-foreground/15"
    >
      <div className={`relative overflow-hidden bg-[#ebe8e1] ${imageAspect}`}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${product.artist} - ${product.title}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes={imageSizes}
            style={imageInset ? { inset: imageInset } : undefined}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            {dictionary.common.noImage}
          </div>
        )}
        {availableStock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <span className="badge-sold font-semibold">{dictionary.productCard.soldOut}</span>
          </div>
        )}
        <div className="absolute left-2.5 top-2.5">{formatBadge(product.format)}</div>
      </div>
      <div className={`${paddingClass} flex flex-1 flex-col`}>
        <p className={`${artistClass} line-clamp-2`}>{product.artist}</p>
        <p
          className={`mt-1.5 line-clamp-2 font-sans font-bold leading-tight tracking-[-0.04em] text-foreground ${titleClass}`}
        >
          {product.title}
        </p>
        <div className={detailWrapperClass}>
          <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-2">
            <span className="uppercase tracking-[0.16em] text-muted">Label</span>
            <span className={detailValueClass}>{product.pressingLabel ?? "—"}</span>
          </div>
          <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-2">
            <span className="uppercase tracking-[0.16em] text-muted">Cat#</span>
            <span className={detailValueClass}>{product.pressingCatalogNumber ?? "—"}</span>
          </div>
          <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-2">
            <span className="uppercase tracking-[0.16em] text-muted">Year</span>
            <span className={detailValueClass}>
              {product.pressingYear ? String(product.pressingYear) : "—"}
            </span>
          </div>
        </div>
        <div className="mt-auto pt-2.5">
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
            <span>
              {availableStock > 0
                ? formatMessage(dictionary.productCard.inStock, { count: availableStock })
                : dictionary.productCard.unavailable}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
