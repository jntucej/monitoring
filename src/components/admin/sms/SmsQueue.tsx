"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw, Trash2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getAuthHeaders } from "@/lib/utils";

interface Row {
  id: string;
  phone_number: string;
  message: string;
  status: string;
  priority: string;
  attempts: number;
  template_code: string | null;
  cost_inr: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  error: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "text-action-warning bg-action-warning/10",
  processing: "text-action-info bg-action-info/10",
  sent: "text-action-primary bg-action-primary/10",
  delivered: "text-action-success bg-emerald-400/10",
  failed: "text-action-danger bg-action-danger/10",
  dead_letter: "text-action-danger bg-rose-400/20",
  expired: "text-text-muted bgtext-muted/10",
};

export function SmsQueue() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (status) params.set("status", status);
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/sms/queue?${params}`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) {
        setRows(json.data.rows as Row[]);
        setTotal(json.data.total as number);
      }
    } catch {
      addToast({ variant: "error", title: "Failed", message: "Could not load SMS queue." });
    } finally {
      setLoading(false);
    }
  }, [page, status, q, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const retry = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/sms/queue/${id}/retry`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        addToast({ variant: "success", title: "Queued for retry", message: "SMS will be re-attempted shortly." });
        load();
      } else {
        addToast({ variant: "error", title: "Failed", message: json.message ?? "Retry failed." });
      }
    } catch {
      addToast({ variant: "error", title: "Network error", message: "Could not retry." });
    }
  };

  const cancel = async (id: string) => {
    if (!confirm("Move this row to dead_letter?")) return;
    try {
      const res = await fetch(`/api/admin/sms/queue/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) {
        addToast({ variant: "info", title: "Cancelled", message: "Row moved to dead_letter." });
        load();
      } else {
        addToast({ variant: "error", title: "Failed", message: json.message ?? "Cancel failed." });
      }
    } catch {
      addToast({ variant: "error", title: "Network error", message: "Could not cancel." });
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="border border-border bg-bg-surface px-2 py-1.5 rounded text-sm"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {["pending", "processing", "sent", "delivered", "failed", "dead_letter"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search phone or message…"
          className="border border-border bg-bg-surface px-3 py-1.5 rounded text-sm flex-1 min-w40"
          aria-label="Search SMS queue"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={load}
          aria-label="Refresh queue"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Refresh
        </Button>
      </div>

      <Card className="overflow-x-auto safe-x">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-muted border-b border-border">
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Message</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Template</th>
              <th className="px-3 py-2">Cost ₹</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-text-muted">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-text-muted">
                  No SMS rows match the current filter.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-bg-elevated">
                  <td className="px-3 py-2 font-mono text-xs">{r.phone_number}</td>
                  <td className="px-3 py-2 max-w55 truncate" title={r.message}>
                    {r.message}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                        STATUS_COLORS[r.status] ?? "text-text-muted"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-text-muted">
                    {r.template_code ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.cost_inr ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-text-muted">
                    {new Date(r.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end">
                      {(r.status === "failed" || r.status === "dead_letter") && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => retry(r.id)}
                          aria-label={`Retry SMS ${r.id}`}
                        >
                          <RotateCcw className="w-3 h-3" aria-hidden="true" /> Retry
                        </Button>
                      )}
                      {r.status !== "delivered" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancel(r.id)}
                          aria-label={`Cancel SMS ${r.id}`}
                        >
                          <Trash2 className="w-3 h-3" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <div className="flex items-center justify-between text-sm text-text-muted">
        <span>
          {total} row{total !== 1 ? "s" : ""} · page {page} / {totalPages}
        </span>
        <div className="flex gap-1">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
