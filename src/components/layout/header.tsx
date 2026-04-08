"use client";

import Link from "next/link";
import { ChevronRight, Disc as RecordIcon, ShoppingCart } from "lucide-react";
import { CartCount } from "./cart-count";
import { LanguageSwitcher } from "./language-switcher";
import { useDictionary, useLocaleContext } from "@/components/providers/locale-provider";
import { siteConfig } from "@/lib/site";

export function Header() {
  const dictionary = useDictionary();
  const { locale } = useLocaleContext();

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-[rgba(250,249,246,0.92)] backdrop-blur">
      <div className="border-b border-border/60 bg-white/70">
        <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs uppercase tracking-[0.22em] text-muted sm:px-6 lg:px-8">
          <span>{dictionary.header.archive}</span>
          <span>{siteConfig.pickupLabel}</span>
        </div>
      </div>
      <div className="container mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-foreground">
          <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-border bg-white">
            <RecordIcon className="h-6 w-6" />
          </span>
          <span>
            <span className="block font-sans text-[1.95rem] font-bold leading-none tracking-[-0.04em]">
              {siteConfig.name}
            </span>
            <span className="mt-1 block text-xs uppercase tracking-[0.26em] text-muted">
              {dictionary.header.recordsMedia}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/catalog" className="text-sm font-medium text-foreground transition-colors hover:text-accent">
            {dictionary.header.browseCatalog}
          </Link>
          <Link href="/shipping" className="text-sm font-medium text-foreground transition-colors hover:text-accent">
            {dictionary.header.shipping}
          </Link>
          <Link href="/track-order" className="text-sm font-medium text-foreground transition-colors hover:text-accent">
            {dictionary.header.trackOrder}
          </Link>
          <Link href="/privacy" className="text-sm font-medium text-foreground transition-colors hover:text-accent">
            {dictionary.header.privacy}
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <LanguageSwitcher locale={locale} />
          </div>
          <Link href="/catalog" className="hidden items-center gap-2 rounded-[1rem] border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-foreground/20 hover:bg-surface-hover md:inline-flex">
            {dictionary.header.shopNow} <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/cart"
            className="relative text-foreground transition-colors hover:text-accent"
            aria-label={dictionary.header.viewCart}
          >
            <ShoppingCart className="h-6 w-6" />
            <div className="absolute -right-2 -top-2">
              <CartCount />
            </div>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 border-t border-border px-4 py-3 text-sm md:hidden">
        <LanguageSwitcher locale={locale} />
        <Link href="/catalog" className="text-muted hover:text-accent">{dictionary.header.browseCatalog}</Link>
        <Link href="/shipping" className="text-muted hover:text-accent">{dictionary.header.shipping}</Link>
        <Link href="/track-order" className="text-muted hover:text-accent">{dictionary.header.trackOrder}</Link>
      </div>
    </header>
  );
}
