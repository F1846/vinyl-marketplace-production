import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  importDiscogsCollectionCsvGenerator,
  importDiscogsInventoryCsvGenerator,
  type DiscogsImportSummary,
} from "@/lib/discogs-import";

type ImportCsvType = "inventory" | "collection";
type ImportDestination = "active" | "archived";

type ImportJobRecord = typeof schema.importJobs.$inferSelect;

export async function createImportJob(input: {
  fileName: string;
  csvType: ImportCsvType;
  destination: ImportDestination;
  totalRows: number;
}) {
  const [job] = await db()
    .insert(schema.importJobs)
    .values({
      fileName: input.fileName.slice(0, 255),
      csvType: input.csvType,
      destination: input.destination,
      totalRows: input.totalRows,
      status: "queued",
    })
    .returning();

  return job;
}

export async function getImportJobById(jobId: string): Promise<ImportJobRecord | null> {
  const job = await db().query.importJobs.findFirst({
    where: eq(schema.importJobs.id, jobId),
  });

  return job ?? null;
}

export async function runImportJob(options: {
  jobId: string;
  text: string;
  csvType: ImportCsvType;
  destination: ImportDestination;
}) {
  try {
    await db()
      .update(schema.importJobs)
      .set({
        status: "running",
        currentItem: "Importing in background...",
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.importJobs.id, options.jobId));

    const generator =
      options.csvType === "collection"
        ? importDiscogsCollectionCsvGenerator(options.text, undefined, options.destination)
        : importDiscogsInventoryCsvGenerator(options.text, undefined, options.destination);

    let finalSummary: DiscogsImportSummary | null = null;

    for await (const event of generator) {
      if (event.type === "start") {
        await db()
          .update(schema.importJobs)
          .set({
            status: "running",
            totalRows: event.total,
            processedRows: 0,
            currentItem: "Preparing import...",
            updatedAt: new Date(),
          })
          .where(eq(schema.importJobs.id, options.jobId));
        continue;
      }

      if (event.type === "progress") {
        await db()
          .update(schema.importJobs)
          .set({
            processedRows: event.processed,
            totalRows: event.total,
            currentItem: event.current.slice(0, 512),
            updatedAt: new Date(),
          })
          .where(eq(schema.importJobs.id, options.jobId));
        continue;
      }

      if (event.type === "error") {
        throw new Error(event.message);
      }

      finalSummary = event.summary;
    }

    if (!finalSummary) {
      throw new Error("Import finished without a completion summary.");
    }

    await db()
      .update(schema.importJobs)
      .set({
        status: "completed",
        processedRows: finalSummary.totalRows,
        totalRows: finalSummary.totalRows,
        currentItem: null,
        summary: finalSummary,
        error: null,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.importJobs.id, options.jobId));
  } catch (error) {
    await db()
      .update(schema.importJobs)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Import failed unexpectedly.",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.importJobs.id, options.jobId));
  }
}

export function isImportCsvType(value: string): value is ImportCsvType {
  return value === "inventory" || value === "collection";
}

