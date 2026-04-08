import { requireAuthenticatedAdmin } from "@/lib/auth";
import { ImportCatalogForm } from "./import-catalog-form";

export const dynamic = "force-dynamic";

export default async function AdminImportPage() {
  await requireAuthenticatedAdmin();

  return <ImportCatalogForm />;
}
