"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { generateCSV } from "@/lib/export";
import { getAuthHeaders } from "@/lib/utils";
import { AuditFilters } from "./AuditFilters";
import { AuditLogRow } from "./AuditLogRow";

export function AuditLogViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionFilter, setActionFilter] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 25;

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set("action", actionFilter);
      if (userIdFilter) params.set("userId", userIdFilter);
      if (fromFilter) params.set("from", new Date(fromFilter).toISOString());
      if (toFilter) params.set("to", new Date(toFilter).toISOString());
      params.set("limit", limit.toString());
      params.set("offset", ((page - 1) * limit).toString());

      const res = await fetch(`/api/admin/audit?${params.toString()}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setLogs(json.data || []);
        setTotal(json.total || 0);
      } else {
        setError(json.error?.message || "Failed to load audit logs");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const handleExport = async () => {
    if (logs.length === 0) return;
    const exportData = logs.map((l) => ({
      Timestamp: l.timestamp ? new Date(l.timestamp).toLocaleString("en-IN") : "",
      Action: l.action,
      "User Name": l.user_name || "N/A",
      Role: l.user_role || "N/A",
      "User ID": l.user_id,
      Details: typeof l.details === "object" ? JSON.stringify(l.details) : l.details || "",
    }));

    const result = await generateCSV(exportData, `audit_logs_${new Date().toISOString().slice(0, 10)}`);
    if (result.success && result.data) {
      const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", result.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-4">
      <AuditFilters
        actionFilter={actionFilter} setActionFilter={setActionFilter}
        userIdFilter={userIdFilter} setUserIdFilter={setUserIdFilter}
        fromFilter={fromFilter} setFromFilter={setFromFilter}
        toFilter={toFilter} setToFilter={setToFilter}
        onApply={() => { setPage(1); fetchLogs(); }}
        onReset={() => { setActionFilter(""); setUserIdFilter(""); setFromFilter(""); setToFilter(""); setPage(1); }}
        onRefresh={fetchLogs} onExport={handleExport}
        loading={loading} exportDisabled={logs.length === 0}
      />

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        {error ? (
          <div className="p-6 text-rose-400 text-sm">{error}</div>
        ) : loading ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">Loading audit telemetry...</div>
        ) : logs.length === 0 ? (
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
                {logs.map((l) => <AuditLogRow key={l.id || l.timestamp} log={l} />)}
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

