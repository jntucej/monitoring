"use client";
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, Loader2 } from "lucide-react";


interface CsvRow {
  row: number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  uniqueId?: string | null;
  employeeId?: string | null;
  department?: string | null;
}
interface CsvRowIssue {
  row: number;
  field?: string | null;
  message: string;
}
interface CsvValidationResult {
  validRows: number;
  invalidRows: number;
  rows: CsvRow[];
  errors: CsvRowIssue[];
  warnings: CsvRowIssue[];
}
interface CsvCommitResult {
  success: boolean;
  importedCount: number;
  failedCount: number;
  errors: Array<{ row: number; error: string }>;
  total?: number;
  created?: number;
  updated?: number;
  failed?: number;
}
export interface CsvValidationPreviewProps {
  validationResult: CsvValidationResult | null;
  commitResult: CsvCommitResult | null;
  committing: boolean;
  skipErrors: boolean;
  setSkipErrors: (v: boolean) => void;
  onCommit: () => void;
}

export function CsvValidationPreview({ validationResult, commitResult, committing, skipErrors, setSkipErrors, onCommit }: CsvValidationPreviewProps) {
  if (!validationResult && !commitResult) return null;
  return (
    <div className="space-y-4">
      {validationResult && (
        <div className="surface-card bg-bg-base p-5 space-y-4">
          <div className="surface-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-text-primary">Dry-Run Preview</span>
              <span className="surface-card px-2 py-0.5 text-xs font-medium bg-emerald-500/10 text-action-success">{validationResult.validRows} Valid</span>
              {validationResult.invalidRows > 0 && <span className="surface-card px-2 py-0.5 text-xs font-medium bg-red-500/10 text-red-500">{validationResult.invalidRows} Errors</span>}
            </div>
            <div className="flex items-center gap-3">
              {validationResult.invalidRows > 0 && (
                <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
                  <input type="checkbox" checked={skipErrors} onChange={(e) => setSkipErrors(e.target.checked)} className="rounded border-border text-[var(--primary)]" />
                  <span>Skip errors</span>
                </label>
              )}
              <button onClick={onCommit} disabled={committing || (validationResult.validRows === 0 && !skipErrors)} className="surface-card flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-action-success text-white hover:bg-action-success disabled:opacity-50 transition">
          <div className="overflow-x-auto max-h-80 border border-border rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--surface-sunken)] text-text-secondary sticky top-0 font-medium">
                <tr><th className="p-2.5">Row</th><th className="p-2.5">Name</th><th className="p-2.5">Email</th><th className="p-2.5">Role</th><th className="p-2.5">ID / Dept</th><th className="p-2.5">Status</th></tr>
              </thead>
              <tbody className="divide-y divideborder-subtle font-mono">
                {validationResult.rows.map((r) => {
                  const rowErrors = validationResult.errors.filter((e) => e.row === r.row);
                  const rowWarns = validationResult.warnings.filter((w) => w.row === r.row);
                  const isOk = rowErrors.length === 0;
                  return (
                    <tr key={r.row} className={isOk ? "hover:bg-[var(--surface-sunken)]/50" : "bg-red-500/5"}>
                      <td className="p-2.5 text-text-muted">#{r.row}</td>
                      <td className="p-2.5 font-sans font-medium text-text-primary">{r.name || "—"}</td>
                      <td className="p-2.5 text-text-secondary">{r.email}</td>
                      <td className="p-2.5 uppercase font-bold text-xs">{r.role}</td>
                      <td className="p-2.5 text-text-secondary">{r.uniqueId || r.employeeId || r.department || "—"}</td>
                      <td className="p-2.5 font-sans">
                        {isOk ? <div className="flex items-center gap-1 text-action-success font-medium"><CheckCircle2 className="w-3.5 h-3.5" /><span>Valid</span></div> :
                          <div className="space-y-0.5">{rowErrors.map((err, idx) => <div key={idx} className="flex items-center gap-1 text-red-500 text-xs"><XCircle className="w-3.5 h-3.5 shrink-0" /><span>{err.message}</span></div>)}</div>}
                        {rowWarns.map((w, idx) => <div key={idx} className="flex items-center gap-1 text-action-warning text-xs"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /><span>{w.message}</span></div>)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
      {commitResult && (
        <div className="surface-card bg-emerald-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-action-success"><CheckCircle2 className="w-5 h-5" /><h4 className="font-semibold text-sm">Bulk Import Succeeded</h4></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            <div className="surface-card p-3 bg-bg-base"><span className="text-xs text-text-muted uppercase font-semibold">Total</span><p className="text-lg font-bold text-text-primary">{commitResult.total}</p></div>
            <div className="surface-card p-3 bg-bg-base"><span className="text-xs text-action-success uppercase font-semibold">Created</span><p className="text-lg font-bold text-action-success">{commitResult.created}</p></div>
            <div className="surface-card p-3 bg-bg-base"><span className="text-xs text-sky-500 uppercase font-semibold">Updated</span><p className="text-lg font-bold text-sky-500">{commitResult.updated}</p></div>
            <div className="surface-card p-3 bg-bg-base"><span className="text-xs text-red-500 uppercase font-semibold">Failed</span><p className="text-lg font-bold text-red-500">{commitResult.failed}</p></div>
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
