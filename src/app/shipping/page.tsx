import { siteConfig } from "@/lib/site";

export const metadata = {
  title: "Shipping and Pickup",
};

export default function ShippingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          Delivery
        </p>
        <h1 className="font-serif text-4xl text-foreground">Shipping and Pickup</h1>
        <p className="text-base leading-7 text-muted">
          Shipping rates are calculated automatically at checkout based on
          destination, quantity, and format.
        </p>
      </div>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-serif text-2xl text-foreground">Shipping</h2>
        <p>
          We use format-aware shipping rules so vinyl, cassette, and CD orders
          are priced fairly. Shipping options are shown in checkout before
          payment.
        </p>
        <p>
          Orders are usually packed within 1 to 2 business days. Tracking is
          added once the parcel has been dispatched.
        </p>
      </section>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-serif text-2xl text-foreground">Local Pickup</h2>
        <p>
          {siteConfig.pickupLabel} is available as a checkout option for local
          customers.
        </p>
        <p>{siteConfig.pickupNote}</p>
      </section>
    </div>
  );
}
