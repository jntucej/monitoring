"use client";
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, Loader2 } from "lucide-react";

export function CsvValidationPreview({ validationResult, commitResult, committing, skipErrors, setSkipErrors, onCommit }: any) {
  if (!validationResult && !commitResult) return null;
  return (
    <div className="space-y-4">
      {validationResult && (
        <div className="bg-[var(--surface-default)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-[var(--text-primary)]">Dry-Run Preview</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">{validationResult.validRows} Valid</span>
              {validationResult.invalidRows > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">{validationResult.invalidRows} Errors</span>}
            </div>
            <div className="flex items-center gap-3">
              {validationResult.invalidRows > 0 && (
                <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
                  <input type="checkbox" checked={skipErrors} onChange={(e) => setSkipErrors(e.target.checked)} className="rounded border-[var(--border-subtle)] text-[var(--primary)]" />
                  <span>Skip errors</span>
                </label>
              )}
              <button onClick={onCommit} disabled={committing || (validationResult.validRows === 0 && !skipErrors)} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition">
          <div className="overflow-x-auto max-h-80 border border-[var(--border-subtle)] rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--surface-sunken)] text-[var(--text-secondary)] sticky top-0 font-medium">
                <tr><th className="p-2.5">Row</th><th className="p-2.5">Name</th><th className="p-2.5">Email</th><th className="p-2.5">Role</th><th className="p-2.5">ID / Dept</th><th className="p-2.5">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
                {validationResult.rows.map((r: any) => {
                  const rowErrors = validationResult.errors.filter((e: any) => e.row === r.row);
                  const rowWarns = validationResult.warnings.filter((w: any) => w.row === r.row);
                  const isOk = rowErrors.length === 0;
                  return (
                    <tr key={r.row} className={isOk ? "hover:bg-[var(--surface-sunken)]/50" : "bg-red-500/5"}>
                      <td className="p-2.5 text-[var(--text-muted)]">#{r.row}</td>
                      <td className="p-2.5 font-sans font-medium text-[var(--text-primary)]">{r.name || "—"}</td>
                      <td className="p-2.5 text-[var(--text-secondary)]">{r.email}</td>
                      <td className="p-2.5 uppercase font-bold text-[10px]">{r.role}</td>
                      <td className="p-2.5 text-[var(--text-secondary)]">{r.uniqueId || r.employeeId || r.department || "—"}</td>
                      <td className="p-2.5 font-sans">
                        {isOk ? <div className="flex items-center gap-1 text-emerald-500 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /><span>Valid</span></div> :
                          <div className="space-y-0.5">{rowErrors.map((err: any, idx: number) => <div key={idx} className="flex items-center gap-1 text-red-500 text-[11px]"><XCircle className="w-3.5 h-3.5 shrink-0" /><span>{err.message}</span></div>)}</div>}
                        {rowWarns.map((w: any, idx: number) => <div key={idx} className="flex items-center gap-1 text-amber-500 text-[11px]"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /><span>{w.message}</span></div>)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
      {commitResult && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-500"><CheckCircle2 className="w-5 h-5" /><h4 className="font-semibold text-sm">Bulk Import Succeeded</h4></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 bg-[var(--surface-default)] rounded-lg border border-[var(--border-subtle)]"><span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Total</span><p className="text-lg font-bold text-[var(--text-primary)]">{commitResult.total}</p></div>
            <div className="p-3 bg-[var(--surface-default)] rounded-lg border border-[var(--border-subtle)]"><span className="text-[10px] text-emerald-500 uppercase font-semibold">Created</span><p className="text-lg font-bold text-emerald-500">{commitResult.created}</p></div>
            <div className="p-3 bg-[var(--surface-default)] rounded-lg border border-[var(--border-subtle)]"><span className="text-[10px] text-sky-500 uppercase font-semibold">Updated</span><p className="text-lg font-bold text-sky-500">{commitResult.updated}</p></div>
            <div className="p-3 bg-[var(--surface-default)] rounded-lg border border-[var(--border-subtle)]"><span className="text-[10px] text-red-500 uppercase font-semibold">Failed</span><p className="text-lg font-bold text-red-500">{commitResult.failed}</p></div>
          </div>
        </div>
      )}

            </table>
          </div>

                {committing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                Commit ({validationResult.validRows} Rows)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
