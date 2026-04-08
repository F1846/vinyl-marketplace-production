import { siteConfig } from "@/lib/site";

export const metadata = {
  title: "Terms and Conditions",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          Policies
        </p>
        <h1 className="font-sans text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">
          Terms and Conditions
        </h1>
        <p className="text-base leading-7 text-muted">
          These terms apply to purchases made through {siteConfig.name}.
        </p>
      </div>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          Product Condition
        </h2>
        <p>
          Used media is sold with visible grading notes. Product photos and
          descriptions are prepared carefully, but minor cosmetic differences can
          exist between listings and the received item.
        </p>
      </section>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          Orders and Payment
        </h2>
        <p>
          Orders are confirmed after successful payment or, for local pickup
          reservations, after order acceptance by the shop. Prices are listed in
          euro and exclude only any explicitly stated shipping charge.
        </p>
      </section>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          Availability
        </h2>
        <p>
          Catalog quantities are limited. If a product becomes unavailable due to
          a stock conflict, the order may be cancelled and any payment will be
          refunded.
        </p>
      </section>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          Support
        </h2>
        <p>
          Questions about an order can be sent to{" "}
          <span className="font-medium text-foreground">
            {siteConfig.legal.contactEmail}
          </span>
          .
        </p>
      </section>
    </div>
  );
}
