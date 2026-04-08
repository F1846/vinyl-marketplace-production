import { getRequestDictionary } from "@/lib/i18n/server";
import { legalAddressLines, siteConfig } from "@/lib/site";

export const metadata = {
  title: "Contact",
};

export default async function ContactPage() {
  const dictionary = await getRequestDictionary();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          {dictionary.footer.contact}
        </p>
        <h1 className="font-sans text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">
          {dictionary.contact.title}
        </h1>
        <p className="text-base leading-7 text-muted">
          {dictionary.contact.body}
        </p>
      </div>

      <section className="card space-y-4">
        <div>
          <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
            {dictionary.contact.support}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            {dictionary.contact.email}: <span className="font-medium text-foreground">{siteConfig.supportEmail}</span>
          </p>
          <p className="text-sm leading-7 text-muted">
            Emergency temporary: <span className="font-medium text-foreground">{siteConfig.emergencyEmail}</span>
          </p>
          <p className="text-xs leading-6 text-muted">{siteConfig.emergencyEmailNote}</p>
          <p className="text-sm leading-7 text-muted">
            {dictionary.contact.pickup}: <span className="font-medium text-foreground">{siteConfig.pickupLabel}</span>
          </p>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="font-sans text-xl font-bold tracking-[-0.04em] text-foreground">
            {dictionary.contact.storeAddress}
          </h3>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
            {legalAddressLines().join("\n")}
          </p>
        </div>
      </section>
    </div>
  );
}
