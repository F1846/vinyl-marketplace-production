import Link from "next/link";
import { Disc as RecordIcon, ArrowRight } from "lucide-react";
import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { ProductCard } from "@/components/catalog/product-card";

export default async function HomePage() {
  const d = db();
  const recentProducts = await d.query.products.findMany({
    where: eq(schema.products.status, "active"),
    orderBy: [desc(schema.products.createdAt)],
    limit: 8,
    with: { images: { orderBy: [schema.productImages.sortOrder] } },
  });

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 rounded-xl border border-border bg-surface px-6 py-16 text-center sm:py-20">
        <div className="flex items-center gap-3">
          <RecordIcon className="h-10 w-10 text-accent sm:h-14 sm:w-14" />
          <h1 className="text-3xl font-bold text-accent sm:text-5xl">F1846 Vinyl</h1>
        </div>
        <p className="max-w-xl text-lg text-muted sm:text-xl">
          Electronic music on physical media. <br />
          Vinyl &bull; Cassettes &bull; CDs
        </p>
        <Link href="/catalog" className="btn-primary text-base">
          Browse the Catalog <ArrowRight className="h-5 w-5" />
        </Link>
      </section>

      {/* New Arrivals */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">New Arrivals</h2>
          <Link href="/catalog" className="text-sm text-accent hover:underline">
            View all <ArrowRight className="inline h-4 w-4" />
          </Link>
        </div>
        {recentProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recentProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="card text-center text-muted">
            <p>Catalog is empty. Check back soon!</p>
          </div>
        )}
      </section>

      {/* Features */}
      <section className="grid gap-6 sm:grid-cols-3">
        {[
          { title: "Goldmine Graded", desc: "Every record graded to Goldmine Standard for both media and sleeve." },
          { title: "Secure Checkout", desc: "Pay safely with Stripe. Your payment details never touch our servers." },
          { title: "Track Your Order", desc: "Get updates with tracking numbers so you know when it arrives." },
        ].map((feature) => (
          <div key={feature.title} className="card">
            <h3 className="text-lg font-semibold text-accent">{feature.title}</h3>
            <p className="mt-2 text-sm text-muted">{feature.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
