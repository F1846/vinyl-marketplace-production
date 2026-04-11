import Link from "next/link";
import { requireAuthenticatedAdmin } from "@/lib/auth";
import { db, schema } from "@/../db";
import { count, desc, eq } from "drizzle-orm";
import { Download, ShieldAlert, ShieldCheck, ShieldX, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Login Logs — Admin" };

const PAGE_SIZE = 100;

const RESULT_META: Record<string, { label: string; className: string; Icon: typeof ShieldCheck }> = {
  success: { label: "Success", className: "badge bg-emerald-100 text-emerald-800", Icon: ShieldCheck },
  invalid_password: { label: "Wrong password", className: "badge bg-red-100 text-red-700", Icon: ShieldX },
  rate_limited: { label: "Rate limited", className: "badge bg-orange-100 text-orange-700", Icon: ShieldAlert },
  missing_password: { label: "Missing password", className: "badge bg-zinc-100 text-zinc-600", Icon: Clock },
};

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAuthenticatedAdmin();

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const d = db();

  const [[{ total }], [{ successCount }], [{ failCount }], [{ rateLimitedCount }]] =
    await Promise.all([
      d.select({ total: count() }).from(schema.adminLoginLogs),
      d.select({ successCount: count() }).from(schema.adminLoginLogs).where(eq(schema.adminLoginLogs.result, "success")),
      d.select({ failCount: count() }).from(schema.adminLoginLogs).where(eq(schema.adminLoginLogs.result, "invalid_password")),
      d.select({ rateLimitedCount: count() }).from(schema.adminLoginLogs).where(eq(schema.adminLoginLogs.result, "rate_limited")),
    ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const logs = await d
    .select()
    .from(schema.adminLoginLogs)
    .orderBy(desc(schema.adminLoginLogs.createdAt))
    .limit(PAGE_SIZE)
    .offset((currentPage - 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Login Logs</h1>
          <p className="mt-1 text-sm text-muted">{total} login attempts total</p>
        </div>
        <Link
          href="/api/admin/logs"
          className="btn-secondary inline-flex items-center gap-2 text-sm"
          download
        >
          <Download className="h-4 w-4" />
          Download CSV
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-emerald-600">{successCount}</p>
          <p className="text-xs text-muted mt-1">Successful logins</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-500">{failCount}</p>
          <p className="text-xs text-muted mt-1">Wrong password</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-orange-500">{rateLimitedCount}</p>
          <p className="text-xs text-muted mt-1">Rate limited</p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {logs.length === 0 ? (
          <p className="p-6 text-sm text-muted text-center">No login attempts recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-4 py-3 text-left font-medium text-muted">Time</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">Result</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">IP</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">User Agent</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const meta = RESULT_META[log.result] ?? {
                    label: log.result,
                    className: "badge-zinc",
                    Icon: Clock,
                  };
                  const Icon = meta.Icon;
                  return (
                    <tr
                      key={log.id}
                      className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-muted font-mono text-xs">
                        {log.createdAt.toISOString().replace("T", " ").substring(0, 19)} UTC
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 ${meta.className} text-xs`}>
                          <Icon className="h-3.5 w-3.5" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">
                        {log.ip ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted max-w-xs truncate">
                        {log.userAgent ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-border bg-white px-4 py-3">
          <p className="text-sm text-muted">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, total)} of {total} entries
          </p>
          <div className="flex items-center gap-2">
            {currentPage > 1 ? (
              <Link href={`/admin/logs?page=${currentPage - 1}`} className="btn-secondary text-sm">Previous</Link>
            ) : (
              <button type="button" className="btn-secondary text-sm" disabled>Previous</button>
            )}
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Page {currentPage} / {totalPages}
            </span>
            {currentPage < totalPages ? (
              <Link href={`/admin/logs?page=${currentPage + 1}`} className="btn-secondary text-sm">Next</Link>
            ) : (
              <button type="button" className="btn-secondary text-sm" disabled>Next</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
