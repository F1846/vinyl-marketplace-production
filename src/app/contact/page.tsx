import { legalAddressLines, siteConfig } from "@/lib/site";

export const metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          Contact
        </p>
        <h1 className="font-sans text-4xl font-bold tracking-[-0.04em] text-foreground">
          Get in touch
        </h1>
        <p className="text-base leading-7 text-muted">
          Use the details below for order questions, pickup coordination, and general support.
        </p>
      </div>

      <section className="card space-y-4">
        <div>
          <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
            Support
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Email: <span className="font-medium text-foreground">{siteConfig.supportEmail}</span>
          </p>
          <p className="text-sm leading-7 text-muted">
            Pickup: <span className="font-medium text-foreground">{siteConfig.pickupLabel}</span>
          </p>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="font-sans text-xl font-bold tracking-[-0.04em] text-foreground">
            Store address
          </h3>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
            {legalAddressLines().join("\n")}
          </p>
        </div>
      </section>
    </div>
  );
}
