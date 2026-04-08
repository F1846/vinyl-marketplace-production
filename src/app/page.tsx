import Link from "next/link";
import {
  ArrowRight,
  Check,
  Disc as RecordIcon,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { db, schema } from "@/db";
import { desc, eq, sql } from "drizzle-orm";
import { ProductCard } from "@/components/catalog/product-card";
import { formatEuroFromCents } from "@/lib/money";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const d = db();
  const recentProducts = await d.query.products.findMany({
    where: eq(schema.products.status, "active"),
    orderBy: [desc(schema.products.createdAt)],
    limit: 8,
    with: { images: { orderBy: [schema.productImages.sortOrder] } },
  });
  const [{ count }] = await d
    .select({ count: sql<number>`count(*)` })
    .from(schema.products)
    .where(eq(schema.products.status, "active"));

  const cheapest = recentProducts.reduce<number | null>(
    (current, product) =>
      current === null ? product.priceCents : Math.min(current, product.priceCents),
    null
  );

  return (
    <div className="space-y-12">
      <section className="grid gap-8 overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(241,240,236,0.92))] px-6 py-10 shadow-soft lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-14">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            <RecordIcon className="h-4 w-4 text-foreground" />
            Independent record store
          </div>
          <div className="space-y-5">
            <h1 className="max-w-3xl font-serif text-5xl leading-none text-foreground sm:text-6xl">
              Records worth opening the parcel for.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted">
              {siteConfig.name} brings together graded electronic music on vinyl,
              cassette, and CD with clean pricing in euro and collector-friendly
              shipping.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/catalog" className="btn-primary text-base">
              Browse the catalog <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/shipping" className="btn-secondary text-base">
              Shipping and pickup
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-border bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Available now</p>
              <p className="mt-2 font-serif text-4xl text-foreground">{count ?? 0}</p>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">From</p>
              <p className="mt-2 font-serif text-4xl text-foreground">
                {cheapest === null ? "0 EUR" : formatEuroFromCents(cheapest)}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Format mix</p>
              <p className="mt-2 font-serif text-3xl text-foreground">Vinyl / Tape / CD</p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {recentProducts.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Fresh in
            </p>
            <h2 className="font-serif text-3xl text-foreground">New arrivals</h2>
          </div>
          <Link href="/catalog" className="text-sm text-accent hover:underline">
            View all <ArrowRight className="inline h-4 w-4" />
          </Link>
        </div>
        {recentProducts.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recentProducts.map((product) => (
              <div key={product.id} className="w-[260px] flex-none">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center text-muted">
            <p>Catalog is empty. Check back soon.</p>
          </div>
        )}
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        {[
          {
            icon: Check,
            title: "Collector-minded grading",
            desc: "Detailed condition notes, format labels, and shelf-ready listings.",
          },
          {
            icon: ShieldCheck,
            title: "Flexible checkout",
            desc: "Use card checkout, PayPal, or reserve for local pickup.",
          },
          {
            icon: Truck,
            title: "Shipping by format",
            desc: "Rates adjust by country, quantity, and media format instead of one flat fee.",
          },
        ].map((feature) => (
          <div key={feature.title} className="card">
            <feature.icon className="h-5 w-5 text-foreground" />
            <h3 className="mt-4 font-serif text-2xl text-foreground">{feature.title}</h3>
            <p className="mt-2 text-sm leading-7 text-muted">{feature.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
