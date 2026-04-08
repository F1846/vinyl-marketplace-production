import { siteConfig } from "@/lib/site";

export const metadata = {
  title: "Refund Policy",
};

export default function RefundPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          Refunds
        </p>
        <h1 className="font-serif text-4xl text-foreground">Refund Policy</h1>
        <p className="text-base leading-7 text-muted">
          If an order arrives damaged or materially different from its listing,
          contact {siteConfig.legal.contactEmail} and include your order number.
        </p>
      </div>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-serif text-2xl text-foreground">Damaged or Incorrect Items</h2>
        <p>
          Please reach out within 14 days of delivery. Include photos of the
          packaging and the item so we can review the issue quickly.
        </p>
      </section>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-serif text-2xl text-foreground">Approved Refunds</h2>
        <p>
          Approved refunds are returned to the original payment method whenever
          possible. For local pickup reservations, any pre-arranged payment
          handling will be confirmed directly by email.
        </p>
      </section>
    </div>
  );
}
