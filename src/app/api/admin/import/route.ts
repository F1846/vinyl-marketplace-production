import { type NextRequest } from "next/server";
import { requireAuthenticatedAdmin } from "@/lib/auth";
import {
  isCollectionCsv,
  importDiscogsInventoryCsvGenerator,
  importDiscogsCollectionCsvGenerator,
} from "@/lib/discogs-import";

// Allow up to 5 minutes for large collection imports
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  await requireAuthenticatedAdmin();

  let text: string;
  let targetStatus: "active" | "archived" = "active";
  try {
    const formData = await request.formData();
    const file = formData.get("csvFile");
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: "No CSV file provided." }, { status: 400 });
    }
    text = await file.text();
    const dest = formData.get("destination");
    if (dest === "archived") targetStatus = "archived";
    else if (dest === "active") targetStatus = "active";
    else targetStatus = isCollectionCsv(text) ? "archived" : "active";
  } catch {
    return Response.json({ error: "Failed to read uploaded file." }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client disconnected
        }
      };

      try {
        const generator = isCollectionCsv(text)
          ? importDiscogsCollectionCsvGenerator(text, request.signal, targetStatus)
          : importDiscogsInventoryCsvGenerator(text, request.signal, targetStatus);

        for await (const event of generator) {
          if (request.signal.aborted) break;
          send(event);
        }
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Import failed unexpectedly.",
        });
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
