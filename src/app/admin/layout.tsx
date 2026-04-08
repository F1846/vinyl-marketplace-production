import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Package, ShoppingCart, LayoutDashboard, ArrowLeft, Truck, Upload } from "lucide-react";
import { adminLogoutAction } from "@/actions/auth";
import { isAuthenticatedAdmin } from "@/lib/auth";
import "./admin.css";

const navLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/import", label: "Import", icon: Upload },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/shipping", label: "Shipping", icon: Truck },
];

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const isAuthed = await isAuthenticatedAdmin();

  if (!isAuthed) {
    return <div className="mx-auto w-full max-w-md">{children}</div>;
  }

  return (
    <div className="flex gap-8">
      <aside className="w-56 flex-shrink-0">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-accent hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to store
          </Link>
          <form action={adminLogoutAction}>
            <button type="submit" className="text-sm text-muted transition-colors hover:text-accent">
              Log Out
            </button>
          </form>
        </div>
        <nav className="space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
