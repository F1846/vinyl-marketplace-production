import Link from "next/link";
import { Disc as RecordIcon, ShoppingCart } from "lucide-react";
import { Suspense } from "react";

function CartCount() {
  // Client-side cart count would use useCart hook
  // For now, server-side we read cookie
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-background">
      0
    </span>
  );
}

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
          <Link href="/admin" className="text-sm font-medium text-muted transition-colors hover:text-accent">
            Admin
          </Link>
        </nav>

        {/* Cart + Mobile search */}
        <div className="flex items-center gap-4">
          <Link href="/cart" className="relative text-foreground transition-colors hover:text-accent">
            <ShoppingCart className="h-6 w-6" />
            <Suspense>
              <CartCount />
            </Suspense>
          </Link>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex justify-center gap-6 border-t border-border px-4 py-2 text-sm md:hidden">
        <Link href="/catalog" className="text-muted hover:text-accent">Catalog</Link>
        <Link href="/track-order" className="text-muted hover:text-accent">Track Order</Link>
        <Link href="/admin" className="text-muted hover:text-accent">Admin</Link>
      </div>
    </header>
  );
}
