import { formatMessage } from "@/lib/i18n/format";
import { getRequestDictionary } from "@/lib/i18n/server";
import { siteConfig } from "@/lib/site";

export const metadata = {
  title: "Privacy Policy",
};

export default async function PrivacyPage() {
  const dictionary = await getRequestDictionary();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
          {dictionary.footer.privacyPolicy}
        </p>
        <h1 className="font-sans text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">
          {dictionary.privacyPage.title}
        </h1>
        <p className="text-base leading-7 text-muted">
          {dictionary.privacyPage.intro}
        </p>
      </div>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          {dictionary.privacyPage.whatCollect}
        </h2>
        <p>{dictionary.privacyPage.whatCollectBody}</p>
        <p>{dictionary.privacyPage.whatCollectBodyTwo}</p>
      </section>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          {dictionary.privacyPage.howUsed}
        </h2>
        <p>{dictionary.privacyPage.howUsedIntro}</p>
        <ul className="space-y-2">
          <li>{dictionary.privacyPage.list1}</li>
          <li>{dictionary.privacyPage.list2}</li>
          <li>{dictionary.privacyPage.list3}</li>
          <li>{dictionary.privacyPage.list4}</li>
        </ul>
      </section>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          {dictionary.privacyPage.thirdParty}
        </h2>
        <p>{dictionary.privacyPage.thirdPartyBody}</p>
      </section>

      <section className="card space-y-3 text-sm leading-7 text-muted">
        <h2 className="font-sans text-2xl font-bold tracking-[-0.04em] text-foreground">
          {dictionary.privacyPage.contact}
        </h2>
        <p>
          {formatMessage(dictionary.privacyPage.contactBody, {
            email: siteConfig.supportEmail,
          })}
        </p>
        <p>
          Orders: <span className="font-medium text-foreground">{siteConfig.orderEmail}</span>
        </p>
      </section>
    </div>
  );
}
