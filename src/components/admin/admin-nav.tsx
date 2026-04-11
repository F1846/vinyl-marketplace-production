"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  ShoppingCart,
  LayoutDashboard,
  ArrowLeft,
  Truck,
  Upload,
  Archive,
  ScrollText,
} from "lucide-react";

const navLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package, exact: false },
  { href: "/admin/inventory", label: "Inventory", icon: Archive, exact: false },
  { href: "/admin/import", label: "Import", icon: Upload, exact: false },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, exact: false },
  { href: "/admin/shipping", label: "Shipping", icon: Truck, exact: false },
  { href: "/admin/logs", label: "Logs", icon: ScrollText, exact: false },
];

type Props = {
  logoutAction: () => Promise<void>;
};

export function AdminNav({ logoutAction }: Props) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* ── Mobile: horizontal scrollable tab bar ── */}
      <div className="md:hidden w-full px-4 sm:px-6">
        {/* Top utility row */}
        <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-accent hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Store
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-xs text-muted hover:text-accent transition-colors"
            >
              Log Out
            </button>
          </form>
        </div>

        {/* Scrollable tab row */}
        <nav
          aria-label="Admin navigation"
          className="flex overflow-x-auto gap-1 pb-2 scrollbar-none border-b border-border mb-4"
        >
          {navLinks.map((link) => {
            const active = isActive(link.href, link.exact);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  active
                    ? "bg-accent text-white"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <link.icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Desktop: sidebar ── */}
      <aside className="hidden w-56 flex-shrink-0 md:block md:pl-4 lg:pl-6" aria-label="Admin navigation">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/"
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
          {navLinks.map((link) => {
            const active = isActive(link.href, link.exact);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent text-white"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <link.icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
