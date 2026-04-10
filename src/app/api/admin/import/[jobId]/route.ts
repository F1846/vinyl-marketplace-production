import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAuthenticatedAdmin } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  await requireAuthenticatedAdmin();

  const { jobId } = await params;
  const job = await db().query.importJobs.findFirst({
    where: eq(schema.importJobs.id, jobId),
  });

  if (!job) {
    return Response.json({ error: "Import job not found." }, { status: 404 });
  }

  return Response.json({
    id: job.id,
    fileName: job.fileName,
    csvType: job.csvType,
    destination: job.destination,
    status: job.status,
    processedRows: job.processedRows,
    totalRows: job.totalRows,
    currentItem: job.currentItem,
    summary: job.summary,
    error: job.error,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}
