import { getRequestDictionary } from "@/lib/i18n/server";
import { legalAddressLines, siteConfig } from "@/lib/site";

export const metadata = {
  title: "Imprint",
};

export default async function ImprintPage() {
  const dictionary = await getRequestDictionary();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          {dictionary.footer.imprint}
        </p>
        <h1 className="font-sans text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">
          {dictionary.imprint.title}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted">
          {dictionary.imprint.body}
        </p>
      </div>

      <section className="card space-y-4">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          {dictionary.imprint.providerInfo}
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-foreground">{dictionary.imprint.storeOperator}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">
              {legalAddressLines().join("\n")}
            </p>
          </div>
          <div className="space-y-3 text-sm text-muted">
            <p>
              <span className="font-medium text-foreground">{dictionary.imprint.email}:</span>{" "}
              {siteConfig.legal.contactEmail}
            </p>
            {siteConfig.legal.phone && (
              <p>
                <span className="font-medium text-foreground">{dictionary.imprint.phone}:</span>{" "}
                {siteConfig.legal.phone}
              </p>
            )}
            {siteConfig.legal.vatId && (
              <p>
                <span className="font-medium text-foreground">{dictionary.imprint.vatId}:</span>{" "}
                {siteConfig.legal.vatId}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          {dictionary.imprint.editorial}
        </h2>
        <p className="text-sm leading-7 text-muted">
          {dictionary.imprint.editorialBody}
        </p>
      </section>
    </div>
  );
}
