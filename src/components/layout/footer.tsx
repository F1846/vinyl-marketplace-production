import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div>
            <span className="text-lg font-bold text-accent">F1846 Vinyl</span>
            <p className="mt-1 text-sm text-muted">Electronic music on physical media</p>
          </div>
          <div className="flex gap-6 text-sm">
            <Link href="/catalog" className="text-muted hover:text-accent transition-colors">
              Catalog
            </Link>
            <Link href="/track-order" className="text-muted hover:text-accent transition-colors">
              Track Order
            </Link>
          </div>
        </div>
        <div className="mt-6 border-t border-border pt-4 text-center text-xs text-muted">
          &copy; {new Date().getFullYear()} F1846 Vinyl. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
