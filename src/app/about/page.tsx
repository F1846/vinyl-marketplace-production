import { siteConfig } from "@/lib/site";

export const metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          About
        </p>
      <h1 className="font-sans text-[1.85rem] font-bold tracking-[-0.04em] text-foreground sm:text-[2.15rem]">
          About {siteConfig.name}
        </h1>
        <p className="text-base leading-7 text-muted">
          {siteConfig.name} is a focused shop for graded vinyl, cassette, and CD copies,
          with an emphasis on electronic music, fair euro pricing, and collector-friendly packing.
        </p>
      </div>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          What the shop focuses on
        </h2>
        <p>
          The catalog is curated rather than bulk-listed. Each product page includes
          condition details, format information, and shipping that adapts to the destination
          country and the mix of media in the order.
        </p>
        <p>
          Orders can be placed with card checkout, PayPal when configured, or local pickup
          from {siteConfig.pickupLabel}.
        </p>
      </section>
    </div>
  );
}
