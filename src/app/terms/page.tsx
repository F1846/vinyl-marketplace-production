import type { Metadata } from "next";
import { formatMessage } from "@/lib/i18n/format";
import { getRequestDictionary } from "@/lib/i18n/server";
import { siteConfig, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms and Conditions | Federico Shop",
  description:
    "Review Federico Shop terms and conditions for purchases, returns, and use of our online vinyl and record shop.",
  alternates: {
    canonical: siteUrl("/terms"),
  },
  robots: {
    index: false,
    follow: false,
  },
};


export default async function TermsPage() {
  const dictionary = await getRequestDictionary();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          {dictionary.footer.terms}
        </p>
        <h1 className="font-sans text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">
          {dictionary.terms.title}
        </h1>
      </div>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          {dictionary.terms.productCondition}
        </h2>
        <p>{dictionary.terms.productConditionBody}</p>
        <p>
          Listing images can come from the Discogs API for release and condition reference.
          If you need custom photos of the exact item, please contact us before ordering.
        </p>
      </section>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          {dictionary.terms.orders}
        </h2>
        <p>{dictionary.terms.ordersBody}</p>
      </section>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          {dictionary.terms.availability}
        </h2>
        <p>{dictionary.terms.availabilityBody}</p>
      </section>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          {dictionary.terms.support}
        </h2>
        <p>{formatMessage(dictionary.terms.supportBody, { email: siteConfig.supportEmail })}</p>
        <p>
          Orders: <span className="font-medium text-foreground">{siteConfig.orderEmail}</span>
        </p>
      </section>
    </div>
  );
}
