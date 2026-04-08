import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-border bg-[rgba(255,255,255,0.76)]">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <span className="font-sans text-3xl font-bold tracking-[-0.04em] text-foreground">
              {siteConfig.name}
            </span>
            <p className="mt-3 max-w-md text-sm leading-7 text-muted">
              {siteConfig.description}
            </p>
          </div>
          <div className="space-y-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Shop</p>
            <div className="flex flex-col gap-3">
              <Link href="/catalog" className="text-muted transition-colors hover:text-accent">
                Catalog
              </Link>
              <Link href="/shipping" className="text-muted transition-colors hover:text-accent">
                Shipping and pickup
              </Link>
              <Link href="/track-order" className="text-muted transition-colors hover:text-accent">
                Track Order
              </Link>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Info</p>
            <div className="flex flex-col gap-3">
              <Link href="/about" className="text-muted transition-colors hover:text-accent">
                About
              </Link>
              <Link href="/contact" className="text-muted transition-colors hover:text-accent">
                Contact
              </Link>
              <Link href="/imprint" className="text-muted transition-colors hover:text-accent">
                Imprint
              </Link>
              <Link href="/privacy" className="text-muted transition-colors hover:text-accent">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-muted transition-colors hover:text-accent">
                Terms
              </Link>
              <Link href="/refund" className="text-muted transition-colors hover:text-accent">
                Refund policy
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-4 text-center text-xs text-muted">
          &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
