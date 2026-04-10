import { requireAuthenticatedAdmin } from "@/lib/auth";
import { db, schema } from "@/../db";
import { desc } from "drizzle-orm";
import { ShieldAlert, ShieldCheck, ShieldX, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Login Logs — Admin" };

const RESULT_META: Record<string, { label: string; className: string; Icon: typeof ShieldCheck }> = {
  success: { label: "Success", className: "badge bg-emerald-100 text-emerald-800", Icon: ShieldCheck },
  invalid_password: { label: "Wrong password", className: "badge bg-red-100 text-red-700", Icon: ShieldX },
  rate_limited: { label: "Rate limited", className: "badge bg-orange-100 text-orange-700", Icon: ShieldAlert },
  missing_password: { label: "Missing password", className: "badge bg-zinc-100 text-zinc-600", Icon: Clock },
};

export default async function AdminLogsPage() {
  await requireAuthenticatedAdmin();

  const logs = await db()
    .select()
    .from(schema.adminLoginLogs)
    .orderBy(desc(schema.adminLoginLogs.createdAt))
    .limit(200);

  const successCount = logs.filter((l) => l.result === "success").length;
  const failCount = logs.filter((l) => l.result === "invalid_password").length;
  const rateLimitedCount = logs.filter((l) => l.result === "rate_limited").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Login Logs</h1>
        <p className="mt-1 text-sm text-muted">Last 200 login attempts</p>
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
    </div>
  );
}
