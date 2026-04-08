import { legalAddressLines, siteConfig } from "@/lib/site";

export const metadata = {
  title: "Imprint",
};

export default function ImprintPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          Legal
        </p>
        <h1 className="font-sans text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">
          Imprint
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted">
          This page contains the operator details for {siteConfig.name}. If any
          legal company information still needs to be updated, replace the
          placeholder address fields in your environment settings before going
          fully live.
        </p>
      </div>

      <section className="card space-y-4">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          Provider Information
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-foreground">Store operator</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">
              {legalAddressLines().join("\n")}
            </p>
          </div>
          <div className="space-y-3 text-sm text-muted">
            <p>
              <span className="font-medium text-foreground">Email:</span>{" "}
              {siteConfig.legal.contactEmail}
            </p>
            {siteConfig.legal.phone && (
              <p>
                <span className="font-medium text-foreground">Phone:</span>{" "}
                {siteConfig.legal.phone}
              </p>
            )}
            {siteConfig.legal.vatId && (
              <p>
                <span className="font-medium text-foreground">VAT ID:</span>{" "}
                {siteConfig.legal.vatId}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          Editorial Responsibility
        </h2>
        <p className="text-sm leading-7 text-muted">
          The operator named above is responsible for the content of this shop,
          product listings, and transaction-related communication.
        </p>
      </section>
    </div>
  );
}
