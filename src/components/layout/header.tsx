import Link from "next/link";
import { ChevronRight, Disc as RecordIcon, ShoppingCart } from "lucide-react";
import { CartCount } from "./cart-count";
import { siteConfig } from "@/lib/site";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-[rgba(250,249,246,0.92)] backdrop-blur">
      <div className="border-b border-border/60 bg-white/70">
        <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs uppercase tracking-[0.22em] text-muted sm:px-6 lg:px-8">
          <span>{siteConfig.tagline}</span>
          <span>{siteConfig.pickupLabel}</span>
        </div>
      </div>
      <div className="container mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-foreground">
          <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-border bg-white">
            <RecordIcon className="h-6 w-6" />
          </span>
          <span>
            <span className="block font-serif text-[1.95rem] leading-none tracking-[-0.02em]">
              {siteConfig.name}
            </span>
            <span className="mt-1 block text-xs uppercase tracking-[0.26em] text-muted">
              Records, tapes, and CDs
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/catalog" className="text-sm font-medium text-foreground transition-colors hover:text-accent">
            Catalog
          </Link>
          <Link href="/shipping" className="text-sm font-medium text-foreground transition-colors hover:text-accent">
            Shipping
          </Link>
          <Link href="/track-order" className="text-sm font-medium text-foreground transition-colors hover:text-accent">
            Track Order
          </Link>
          <Link href="/privacy" className="text-sm font-medium text-foreground transition-colors hover:text-accent">
            Privacy
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/catalog" className="hidden items-center gap-2 rounded-[1rem] border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-foreground/20 hover:bg-surface-hover md:inline-flex">
            Shop now <ChevronRight className="h-4 w-4" />
          </Link>
          <Link href="/cart" className="relative text-foreground transition-colors hover:text-accent" aria-label="View cart">
            <ShoppingCart className="h-6 w-6" />
            <div className="absolute -right-2 -top-2">
              <CartCount />
            </div>
          </Link>
        </div>
      </div>

      <div className="flex justify-center gap-6 border-t border-border px-4 py-3 text-sm md:hidden">
        <Link href="/catalog" className="text-muted hover:text-accent">Catalog</Link>
        <Link href="/shipping" className="text-muted hover:text-accent">Shipping</Link>
        <Link href="/track-order" className="text-muted hover:text-accent">Track Order</Link>
      </div>
    </header>
  );
}
