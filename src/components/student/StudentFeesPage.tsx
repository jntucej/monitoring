"use client";

import { useEffect, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { FeeDisputeComposer } from "@/components/student/FeeDisputeComposer";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, CheckCircle2, AlertCircle, Inbox, Shield, CreditCard } from "lucide-react";

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

interface AidRow {
  id: string;
  scheme: string;
  amount: number;
  status: string;
}

export function StudentFeesPage() {
  const [data, setData] = useState<{ totalDue: number; totalAid: number; netDue: number; items: FeeItem[]; aid: AidRow[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<string | undefined>(undefined);
  const [utrRef, setUtrRef] = useState("");
  const [paying, setPaying] = useState(false);
  const [payDone, setPayDone] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

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

  const pay = async () => {
    if (!payMethod || !utrRef.trim()) return;
    setPaying(true); setPayError(null); setPayDone(false);
    try {
      const res = await fetch("/api/student/fees", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payMethod, utrRef: utrRef.trim() }),
      });
      const json = await res.json();
      if (json.success) { setPayDone(true); setUtrRef(""); setPayMethod(undefined); }
      else setPayError(json.error?.message ?? "Could not log payment reference");
    } catch {
      setPayError("Network error");
    }
    setPaying(false);
  };

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
                <p className="text-sm font-medium text-text-primary">No fee items on record</p>
                <p className="text-xs text-text-muted mt-1">
                  Tuition, hostel, and exam fee dues appear here once posted by the Accounts Office. Contact the Accounts section if you expect a pending challan.
                </p>
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

          {outstanding.length > 0 && (
            <WidgetBoundary name="fee-dispute" title="Dispute a fee">
              <FeeDisputeComposer
                feeItems={outstanding.map((i) => ({ id: i.id, feeType: i.feeType, amount: i.amount - i.paid }))}
              />
            </WidgetBoundary>
          )}

          {/* ── Aid / scholarships (scholarship_awards, migration 60) ── */}
          {(data.aid?.length ?? 0) > 0 && (
            <WidgetBoundary name="fee-aid" title="Scholarships & aid">
              <div className="space-y-2">
                {data.aid.map((a) => (
                  <div key={a.id} className="flex items-center justify-between surface-card p-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{a.scheme}</p>
                      <p className="text-xs text-text-muted">{fmt(a.amount)}</p>
                    </div>
                    <Badge variant={a.status === "APPROVED" || a.status === "AWARDED" ? "success" : "leave"} dot={false}>
                      {a.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </WidgetBoundary>
          )}

          {/* ── Pay drawer (SBI Collect / UPI — webhook-driven) ────────── */}
          {outstanding.length > 0 && (
            <WidgetBoundary name="fee-pay" title="Log a payment reference">
              {payDone ? (
                <div className="surface-card bg-emerald-500/10 p-3 text-sm text-action-success flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Payment reference logged. The UPI/SBI webhook will reconcile it against the ledger.
                </div>
              ) : (
                <div className="surface-card p-4 space-y-3">
                  <p className="text-xs text-text-muted flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    Log your UPI / SBI-Collect reference. The <code>integration_adapters.sbi_collect_upi_fee</code> webhook reconciles it against the ledger.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-text-secondary">Method</label>
                      <Select
                        aria-label="Payment method"
                        placeholder="Select method"
                        value={payMethod}
                        onChange={setPayMethod}
                        options={[
                          { value: "SBI_COLLECT", label: "SBI Collect" },
                          { value: "UPI", label: "UPI" },
                          { value: "CARD", label: "Card" },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-text-secondary">UTR / reference</label>
                      <Input
                        aria-label="UTR / reference"
                        placeholder="e.g. 482938475612"
                        value={utrRef}
                        onChange={(e) => setUtrRef(e.target.value)}
                      />
                    </div>
                  </div>
                  {payError && <p className="text-xs text-action-danger">{payError}</p>}
                  <Button variant="primary" size="sm" onClick={pay} disabled={!payMethod || !utrRef.trim() || paying}>
                    {paying ? "Logging…" : "Log payment reference"}
                  </Button>
                </div>
              )}
            </WidgetBoundary>
          )}
        </>
      )}
    </div>
  );
}

export default StudentFeesPage;
