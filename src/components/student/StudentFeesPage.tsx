"use client";

import { useEffect, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Loader2, Wallet, CheckCircle2, AlertCircle, Inbox } from "lucide-react";

interface FeeItem {
  id: string;
  feeType: string;
  amount: number;
  paid: number;
  dueDate: string | null;
  status: string;
  receiptNo: string | null;
  paidAt: string | null;
}

export function StudentFeesPage() {
  const [data, setData] = useState<{ totalDue: number; items: FeeItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/student/fees", { credentials: "include" });
        const json = await res.json();
        if (json.success && json.data) setData(json.data);
        else setError(json.error?.message ?? "Failed to load fees");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load fees");
      }
    })();
  }, []);

  const outstanding = (data?.items ?? []).filter((i) => i.status !== "PAID" && i.status !== "WAIVED");
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Fees</h1>
        <p className="text-sm text-text-muted">Your fee items, dues, and receipts.</p>
      </div>

      {error && <div className="surface-card bg-rose-500/10 p-3 text-sm text-action-danger">{error}</div>}

      {data === null && !error && (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading fees…
        </div>
      )}

      {data && (
        <>
          <WidgetBoundary name="fee-summary" title="Fee summary">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="surface-card p-3">
                <div className="flex items-center gap-2 text-text-muted">
                  <Wallet className="w-4 h-4" />
                  <span className="text-xs uppercase">Total due</span>
                </div>
                <p className={`text-2xl font-bold ${data.totalDue > 0 ? "text-action-danger" : "text-action-success"}`}>
                  {fmt(data.totalDue)}
                </p>
              </div>
              <div className="surface-card p-3">
                <div className="flex items-center gap-2 text-text-muted">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs uppercase">Outstanding</span>
                </div>
                <p className="text-2xl font-bold text-text-primary">{outstanding.length}</p>
              </div>
              <div className="surface-card p-3">
                <div className="flex items-center gap-2 text-text-muted">
                  <CheckCircle2 className="w-4 h-4 text-action-success" />
                  <span className="text-xs uppercase">Paid</span>
                </div>
                <p className="text-2xl font-bold text-action-success">
                  {(data.items ?? []).length - outstanding.length}
                </p>
              </div>
            </div>
          </WidgetBoundary>

          <WidgetBoundary name="fee-items" title="Fee items">
            {(data.items ?? []).length === 0 ? (
              <div className="surface-card p-8 text-center">
                <Inbox className="w-6 h-6 text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-muted">No fee items.</p>
              </div>
            ) : (
              <div className="surface-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-text-muted text-xs uppercase tracking-wide border-b border-border">
                      <th className="text-left px-3 py-2">Fee</th>
                      <th className="text-left px-3 py-2">Due</th>
                      <th className="text-right px-3 py-2">Amount</th>
                      <th className="text-right px-3 py-2">Paid</th>
                      <th className="text-right px-3 py-2">Balance</th>
                      <th className="text-right px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {data.items.map((i) => {
                      const bal = i.amount - i.paid;
                      const open = i.status !== "PAID" && i.status !== "WAIVED";
                      return (
                        <tr key={i.id}>
                          <td className="px-3 py-2 text-text-secondary">{i.feeType}</td>
                          <td className="px-3 py-2 text-text-muted">
                            {i.dueDate ? new Date(i.dueDate).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmt(i.amount)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmt(i.paid)}</td>
                          <td className={`px-3 py-2 text-right tabular-nums font-semibold ${open ? "text-action-danger" : "text-text-muted"}`}>
                            {open ? fmt(bal) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                              i.status === "PAID" ? "bg-emerald-500/15 text-action-success"
                                : i.status === "WAIVED" ? "bg-bg-elevated text-text-muted"
                                : "bg-rose-500/15 text-action-danger"
                            }`}>
                              {i.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </WidgetBoundary>
        </>
      )}
    </div>
  );
}

export default StudentFeesPage;
