"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedAdmin } from "@/lib/auth";
import {
  importDiscogsInventoryCsv,
  importDiscogsCollectionCsv,
  isCollectionCsv,
  type DiscogsImportSummary,
} from "@/lib/discogs-import";

type ImportState = {
  error: string | null;
  success: boolean;
  summary: DiscogsImportSummary | null;
  csvType?: "inventory" | "collection";
};

export async function importCatalogCsvAction(
  _prevState: ImportState,
  formData: FormData
): Promise<ImportState> {
  await requireAuthenticatedAdmin();

  const file = formData.get("csvFile");
  if (!(file instanceof File) || file.size === 0) {
    return {
      error: "Please upload a Discogs inventory or collection CSV file.",
      success: false,
      summary: null,
    };
  }

  try {
    const text = await file.text();
    const csvType = isCollectionCsv(text) ? "collection" : "inventory";
    const summary =
      csvType === "collection"
        ? await importDiscogsCollectionCsv(text)
        : await importDiscogsInventoryCsv(text);

    revalidatePath("/");
    revalidatePath("/catalog");
    revalidatePath("/admin");
    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");

    return { error: null, success: true, summary, csvType };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Import failed.",
      success: false,
      summary: null,
    };
  }
}
