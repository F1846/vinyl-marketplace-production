import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getRequestDictionary } from "@/lib/i18n/server";

export default async function NotFoundPage() {
  const dictionary = await getRequestDictionary();

  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="font-sans text-6xl font-bold tracking-[-0.04em] text-accent">404</h1>
      <p className="mt-4 text-lg text-muted">{dictionary.notFound.productNotFound}</p>
      <Link href="/catalog" className="btn-primary mt-6 inline-flex">
        <ArrowLeft className="h-4 w-4" /> {dictionary.notFound.backToCatalog}
      </Link>
    </div>
  );
}
