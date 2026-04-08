"use client";

import Link from "next/link";
import { useDictionary } from "@/components/providers/locale-provider";
import {
  buildCatalogPath,
  catalogFormatCollections,
  catalogGenreCollections,
  siteConfig,
} from "@/lib/site";

export function Footer() {
  const dictionary = useDictionary();

  return (
    <footer className="border-t border-border bg-[rgba(255,255,255,0.76)]">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
          <div>
            <span className="font-sans text-3xl font-bold tracking-[-0.04em] text-foreground">
              {siteConfig.name}
            </span>
            <p className="mt-3 max-w-md text-sm leading-7 text-muted">
              {dictionary.home.worthHavingBody}
            </p>
          </div>
          <div className="space-y-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">{dictionary.footer.shop}</p>
            <div className="flex flex-col gap-3">
              <Link href="/catalog" className="text-muted transition-colors hover:text-accent">
                {dictionary.header.browseCatalog}
              </Link>
              <Link href="/shipping" className="text-muted transition-colors hover:text-accent">
                {dictionary.footer.shippingAndPickup}
              </Link>
              <Link href="/track-order" className="text-muted transition-colors hover:text-accent">
                {dictionary.footer.trackOrder}
              </Link>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">{dictionary.footer.info}</p>
            <div className="flex flex-col gap-3">
              <Link href="/about" className="text-muted transition-colors hover:text-accent">
                {dictionary.footer.about}
              </Link>
              <Link href="/contact" className="text-muted transition-colors hover:text-accent">
                {dictionary.footer.contact}
              </Link>
              <Link href="/imprint" className="text-muted transition-colors hover:text-accent">
                {dictionary.footer.imprint}
              </Link>
              <Link href="/privacy" className="text-muted transition-colors hover:text-accent">
                {dictionary.footer.privacyPolicy}
              </Link>
              <Link href="/terms" className="text-muted transition-colors hover:text-accent">
                {dictionary.footer.terms}
              </Link>
              <Link href="/refund" className="text-muted transition-colors hover:text-accent">
                {dictionary.footer.refundPolicy}
              </Link>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              {dictionary.footer.popularSearches}
            </p>
            <div className="flex flex-col gap-3">
              {catalogFormatCollections.map((collection) => (
                <Link
                  key={collection.format}
                  href={buildCatalogPath({ format: collection.format })}
                  className="text-muted transition-colors hover:text-accent"
                >
                  {collection.label}
                </Link>
              ))}
              {catalogGenreCollections.slice(0, 4).map((collection) => (
                <Link
                  key={collection.genre}
                  href={buildCatalogPath({ genre: collection.genre })}
                  className="text-muted transition-colors hover:text-accent"
                >
                  {collection.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-4 text-center text-xs text-muted">
          &copy; {new Date().getFullYear()} {siteConfig.name}. {dictionary.footer.allRightsReserved}
        </div>
      </div>
    </footer>
  );
}
