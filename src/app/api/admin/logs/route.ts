import { requireAuthenticatedAdmin } from "@/lib/auth";
import { db, schema } from "@/../db";
import { desc } from "drizzle-orm";

export async function GET() {
  await requireAuthenticatedAdmin();

  const logs = await db()
    .select()
    .from(schema.adminLoginLogs)
    .orderBy(desc(schema.adminLoginLogs.createdAt))
    .limit(1000);

  const rows = [
    ["timestamp_utc", "result", "ip", "user_agent"],
    ...logs.map((log) => [
      log.createdAt.toISOString().replace("T", " ").substring(0, 19),
      log.result,
      log.ip ?? "",
      (log.userAgent ?? "").replace(/"/g, '""'),
    ]),
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="login-logs-${new Date().toISOString().substring(0, 10)}.csv"`,
    },
  });
}
