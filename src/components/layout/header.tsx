import Link from "next/link";
import { Disc as RecordIcon, ShoppingCart } from "lucide-react";
import { CartCount } from "./cart-count";

export function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo / Store name */}
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-accent">
          <RecordIcon className="h-7 w-7" />
          <span>F1846 Vinyl</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/catalog" className="text-sm font-medium text-foreground transition-colors hover:text-accent">
            Catalog
          </Link>
          <Link href="/track-order" className="text-sm font-medium text-foreground transition-colors hover:text-accent">
            Track Order
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/cart" className="relative text-foreground transition-colors hover:text-accent" aria-label="View cart">
            <ShoppingCart className="h-6 w-6" />
            <div className="absolute -right-2 -top-2">
              <CartCount />
            </div>
          </Link>
        </div>
      </div>

      <div className="flex justify-center gap-6 border-t border-border px-4 py-2 text-sm md:hidden">
        <Link href="/catalog" className="text-muted hover:text-accent">Catalog</Link>
        <Link href="/track-order" className="text-muted hover:text-accent">Track Order</Link>
      </div>
    </header>
  );
}
