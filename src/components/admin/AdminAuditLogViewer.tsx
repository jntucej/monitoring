"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, History, Download, RefreshCw } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { generateCSV } from "@/lib/export";

type Scope = "campus" | "all";

interface AuditItem {
  id: string;
  action: string;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  details: Record<string, unknown>;
  timestamp: string;
}

const PAGE_SIZE = 25;

/**
 * Admin campus-split audit trail viewer.
 *
 * Consumes /api/admin/audit-logs which already filters out infra-noise
 * actions for the campus scope. The "all" scope is sysadmin-only and is
 * enforced server-side against the DB role, so the client only surfaces the
 * toggle and lets the API respond with 403 for non-sysadmins.
 */
export function AdminAuditLogViewer({ canViewAll }: { canViewAll?: boolean }) {
  const [scope, setScope] = useState<Scope>("campus");
  const [items, setItems] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionFilter, setActionFilter] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Generation counter guards against a stale in-flight response (fast
  // page/scope/refresh changes) clobbering newer state.
  const reqGen = useRef(0);

  const fetchLogs = useCallback(
    async (s: Scope, p: number) => {
      const gen = ++reqGen.current;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("scope", s);
        if (actionFilter) params.set("action", actionFilter);
        if (userIdFilter) params.set("userId", userIdFilter);
        if (fromFilter) params.set("from", new Date(fromFilter).toISOString());
        if (toFilter) params.set("to", new Date(toFilter).toISOString());
        params.set("page", p.toString());
        params.set("pageSize", PAGE_SIZE.toString());

        const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
          headers: getAuthHeaders(),
          cache: "no-store",
        });
        const json = await res.json();

        if (gen !== reqGen.current) return; // a newer request superseded this one
        if (res.ok && json.success) {
          setItems(Array.isArray(json.items) ? json.items : []);
          setTotal(json.total ?? 0);
        } else {
          const msg =
            typeof json.error === "string"
              ? json.error
              : json.error?.message ?? "Failed to load audit logs";
          setError(msg);
          setItems([]);
          setTotal(0);
        }
      } catch (err) {
        if (gen === reqGen.current) {
          setError(err instanceof Error ? err.message : "Network error");
        }
      } finally {
        if (gen === reqGen.current) setLoading(false);
      }
    },
    [actionFilter, userIdFilter, fromFilter, toFilter]
  );

  useEffect(() => {
    void fetchLogs(scope, page);
  }, [page, scope, reloadKey, fetchLogs]);

  const handleExport = async () => {
    if (items.length === 0) return;
    const exportData = items.map((l) => ({
      Timestamp: l.timestamp ? new Date(l.timestamp).toLocaleString("en-IN") : "",
      Action: l.action,
      "User Name": l.userName || "N/A",
      Role: l.userRole || "N/A",
      "User ID": l.userId || "",
      Details: JSON.stringify(l.details ?? {}),
    }));
    const result = await generateCSV(exportData, `audit_logs_${scope}_${new Date().toISOString().slice(0, 10)}`);
    if (result.success && result.data) {
      const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", result.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Scope</span>
          {(["campus", "all"] as const).map((s) => {
            const disabled = s === "all" && !canViewAll;
            return (
              <button
                key={s}
                onClick={() => {
                  if (disabled) return;
                  setScope(s);
                  setPage(1);
                }}
                disabled={disabled}
                title={
                  s === "all"
                    ? "Shows the full, unfiltered trail. Requires the sysadmin role."
                    : "Campus operational events, infra-noise filtered out."
                }
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  scope === s
                    ? "bg-[var(--action-primary)] text-white"
                    : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border)]"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {s === "campus" ? "Campus" : "All (sysadmin)"}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loading}
            className="p-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md flex items-center gap-1.5 hover:bg-[var(--bg-base)]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleExport}
            disabled={items.length === 0}
            className="p-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md flex items-center gap-1.5 hover:bg-[var(--bg-base)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        {scope === "campus"
          ? "Campus scope hides infra-noise actions (auth, MFA, sessions, backups, retention, migrations, metrics, security, RLS)."
          : "All scope shows the complete trail. This view requires the sysadmin role."}
      </p>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          placeholder="Action (e.g. GATE_ONLINE)"
          className="px-3 py-2 rounded-lg text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)]"
        />
        <input
          value={userIdFilter}
          onChange={(e) => setUserIdFilter(e.target.value)}
          placeholder="User ID"
          className="px-3 py-2 rounded-lg text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)]"
        />
        <input
          type="date"
          value={fromFilter}
          onChange={(e) => setFromFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)]"
        />
        <input
          type="date"
          value={toFilter}
          onChange={(e) => setToFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)]"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setPage(1);
            setReloadKey((k) => k + 1);
          }}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--action-primary)] text-white"
        >
          Apply
        </button>
        <button
          onClick={() => {
            setActionFilter("");
            setUserIdFilter("");
            setFromFilter("");
            setToFilter("");
            setPage(1);
          }}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border)]"
        >
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        {error ? (
          <div className="p-6 text-rose-400 text-sm flex items-center gap-2">
            <History className="w-4 h-4" /> {error}
          </div>
        ) : loading ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">Loading audit telemetry...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">No audit records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[750px]">
              <thead className="bg-[var(--bg-elevated)] text-xs text-[var(--text-muted)] uppercase font-semibold border-b border-[var(--border)]">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {items.map((l) => (
                  <tr key={l.id || l.timestamp} className="hover:bg-[var(--bg-elevated)]">
                    <td className="py-2.5 px-4 text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {l.timestamp ? new Date(l.timestamp).toLocaleString("en-IN") : "—"}
                    </td>
                    <td className="py-2.5 px-4">
                      <code className="text-xs bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-1.5 py-0.5 text-emerald-400">
                        {l.action}
                      </code>
                    </td>
                    <td className="py-2.5 px-4 text-xs">{l.userName || l.userId || "N/A"}</td>
                    <td className="py-2.5 px-4 text-xs text-[var(--text-muted)]">{l.userRole || "—"}</td>
                    <td className="py-2.5 px-4 text-xs text-[var(--text-muted)] max-w-xs">
                      <span className="line-clamp-2">{JSON.stringify(l.details ?? {})}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>Total: {total} items</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="p-1 rounded border border-[var(--border)] disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span>{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="p-1 rounded border border-[var(--border)] disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
