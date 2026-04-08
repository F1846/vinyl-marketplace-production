import type { Metadata } from "next";
import { formatMessage } from "@/lib/i18n/format";
import { getRequestDictionary } from "@/lib/i18n/server";
import { siteConfig, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Shipping and Pickup",
  description:
    "Review Federico Shop shipping rates, local pickup in Berlin Neukolln, and format-aware delivery information for vinyl, cassette, and CD orders.",
  keywords: [
    "Federico Shop shipping",
    "Berlin local pickup records",
    "vinyl shipping Europe",
    "cassette shipping Germany",
    "CD shipping Europe",
  ],
  alternates: {
    canonical: siteUrl("/shipping"),
  },
};

export default async function ShippingPage() {
  const dictionary = await getRequestDictionary();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          {dictionary.shippingPage.delivery}
        </p>
        <h1 className="font-sans text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">
          {dictionary.shippingPage.title}
        </h1>
        <p className="text-base leading-7 text-muted">
          {dictionary.shippingPage.rates}
        </p>
      </div>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          {dictionary.shippingPage.shipping}
        </h2>
        <p>{dictionary.shippingPage.shippingBody}</p>
        <p>{dictionary.shippingPage.shippingBodyTwo}</p>
      </section>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          {dictionary.shippingPage.localPickup}
        </h2>
        <p>{formatMessage(dictionary.shippingPage.localPickupBody, { pickupLabel: siteConfig.pickupLabel })}</p>
        <p>{siteConfig.pickupNote}</p>
      </section>
    </div>
  );
}
