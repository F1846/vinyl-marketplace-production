"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedAdmin } from "@/lib/auth";
import {
  importDiscogsInventoryCsv,
  importDiscogsCollectionCsv,
  isCollectionCsv,
  type DiscogsImportSummary,
} from "@/lib/discogs-import";

const ACCEPTED_CSV_TYPES = new Set([
  "text/csv",
  "text/plain",
  "application/csv",
  "application/vnd.ms-excel",
]);
const MAX_CSV_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

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
      error: "Please upload a CSV file.",
      success: false,
      summary: null,
    };
  }

  if (file.size > MAX_CSV_SIZE_BYTES) {
    return {
      error: "File too large. Maximum allowed size is 10 MB.",
      success: false,
      summary: null,
    };
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "csv") {
    return {
      error: "Only .csv files are accepted.",
      success: false,
      summary: null,
    };
  }

  if (file.type && !ACCEPTED_CSV_TYPES.has(file.type.toLowerCase().split(";")[0]!.trim())) {
    return {
      error: "Invalid file type. Only CSV files are accepted.",
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
    console.error("importCatalogCsvAction failed:", error);
    return {
      error: error instanceof Error ? error.message : "Import failed.",
      success: false,
      summary: null,
    };
  }
}
