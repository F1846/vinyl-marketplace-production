"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Package,
  ShoppingCart,
  LayoutDashboard,
  ArrowLeft,
  Truck,
  Upload,
  Archive,
  Menu,
  X,
} from "lucide-react";

const navLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/inventory", label: "Inventory", icon: Archive },
  { href: "/admin/import", label: "Import", icon: Upload },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/shipping", label: "Shipping", icon: Truck },
];

type Props = {
  logoutAction: () => Promise<void>;
};

function NavLinks({
  logoutAction,
  onNavigate,
}: {
  logoutAction: () => Promise<void>;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2 text-sm text-accent hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to store
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-sm text-muted transition-colors hover:text-accent"
          >
            Log Out
          </button>
        </form>
      </div>
      <nav aria-label="Admin navigation" className="space-y-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <link.icon className="h-5 w-5" />
            {link.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

export function AdminNav({ logoutAction }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4 md:hidden">
        <span className="text-sm font-semibold text-foreground tracking-wide">Admin</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={open}
          aria-controls="admin-mobile-drawer"
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
        >
          <Menu className="h-5 w-5" />
          <span className="text-xs">Menu</span>
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        id="admin-mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation"
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-background p-6 shadow-xl transition-transform duration-200 md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close navigation menu"
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mt-8">
          <NavLinks logoutAction={logoutAction} onNavigate={() => setOpen(false)} />
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-56 flex-shrink-0 md:block" aria-label="Admin navigation">
        <NavLinks logoutAction={logoutAction} />
      </aside>
    </>
  );
}
