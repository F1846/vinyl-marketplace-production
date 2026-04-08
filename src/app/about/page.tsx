import { formatMessage } from "@/lib/i18n/format";
import { getRequestDictionary } from "@/lib/i18n/server";
import { siteConfig } from "@/lib/site";

export const metadata = {
  title: "About",
};

export default async function AboutPage() {
  const dictionary = await getRequestDictionary();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          {dictionary.footer.about}
        </p>
        <h1 className="font-sans text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">
          {dictionary.about.title}
        </h1>
        <p className="text-base leading-7 text-muted">
          {dictionary.about.body}
        </p>
      </div>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          {dictionary.about.whatFocuses}
        </h2>
        <p>
          {formatMessage(dictionary.about.orders, { pickupLabel: siteConfig.pickupLabel })}
        </p>
      </section>
    </div>
  );
}
