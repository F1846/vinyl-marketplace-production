import { after, type NextRequest } from "next/server";
import { requireAuthenticatedAdmin } from "@/lib/auth";
import {
  inspectDiscogsCollectionCsv,
  inspectDiscogsInventoryCsv,
  isCollectionCsv,
} from "@/lib/discogs-import";
import { createImportJob, runImportJob } from "@/lib/import-jobs";

// Allow up to 5 minutes for large collection imports
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  await requireAuthenticatedAdmin();

  let text: string;
  let fileName = "import.csv";
  let targetStatus: "active" | "archived" = "active";
  try {
    const formData = await request.formData();
    const file = formData.get("csvFile");
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: "No CSV file provided." }, { status: 400 });
    }
    fileName = file.name;
    text = await file.text();
    const dest = formData.get("destination");
    if (dest === "archived") targetStatus = "archived";
    else if (dest === "active") targetStatus = "active";
    else targetStatus = isCollectionCsv(text) ? "archived" : "active";
  } catch {
    return Response.json({ error: "Failed to read uploaded file." }, { status: 400 });
  }

  const csvType = isCollectionCsv(text) ? "collection" : "inventory";
  const inspection =
    csvType === "collection"
      ? inspectDiscogsCollectionCsv(text)
      : inspectDiscogsInventoryCsv(text);

  const job = await createImportJob({
    fileName,
    csvType,
    destination: targetStatus,
    totalRows: inspection.totalRows,
  });

  after(async () => {
    await runImportJob({
      jobId: job.id,
      text,
      csvType,
      destination: targetStatus,
    });
  });

  return Response.json({
    jobId: job.id,
    csvType,
    destination: targetStatus,
    totalRows: inspection.totalRows,
  });
}
