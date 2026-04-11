import type { Metadata } from "next";
import { formatMessage } from "@/lib/i18n/format";
import { getRequestDictionary } from "@/lib/i18n/server";
import { siteConfig, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Refund Policy | Federico Shop",
  description:
    "Read Federico Shop refund and return policy for vinyl records, cassette tapes, and CDs ordered online.",
  alternates: {
    canonical: siteUrl("/refund"),
  },
  robots: {
    index: false,
    follow: false,
  },
};


export default async function RefundPage() {
  const dictionary = await getRequestDictionary();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          {dictionary.footer.refundPolicy}
        </p>
        <h1 className="font-sans text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">
          {dictionary.refund.title}
        </h1>
        <p className="text-base leading-7 text-muted">
          {formatMessage(dictionary.refund.intro, { email: siteConfig.supportEmail })}
        </p>
        <p className="text-sm leading-7 text-muted">
          Orders: <span className="font-medium text-foreground">{siteConfig.orderEmail}</span>
        </p>
      </div>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          {dictionary.refund.damaged}
        </h2>
        <p>{dictionary.refund.damagedBody}</p>
      </section>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          {dictionary.refund.approved}
        </h2>
        <p>{dictionary.refund.approvedBody}</p>
      </section>
    </div>
  );
}
