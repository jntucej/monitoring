"use client";

import { useState } from "react";
import {
  Upload, X, CheckCircle2, AlertTriangle, FileText, Loader2, ScrollText, Download,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";

interface BulkUserImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface PreviewError {
  row: number;
  field?: string;
  message: string;
}

interface RowReport {
  row: number;
  roll?: string;
  name?: string;
  email?: string;
  status: "imported" | "skipped" | "invalid";
  reason: string;
}

interface BulkImportReport {
  totalRows: number;
  imported: number;
  skipped: number;
  invalid: number;
  rows: RowReport[];
}

interface PreviewState {
  summary: { total: number; valid: number; invalid: number; skipped: number };
  errors: PreviewError[];
  skippedRows: Array<{ row: number; roll: string; name?: string }>;
  importedBefore: number;
}

// 8-column minimal sheet — the exact headers the college sheet uses.
// FATHER/GUARDIAN_NAME (with the slash) normalizes to the same key the
// importer's pick() alias system resolves, so it maps to fatherGuardianName.
const MINIMAL_CSV =
  "HTNO,STUDENT_NAME,FATHER/GUARDIAN_NAME,GENDER,MOBILE,DOB,EMAIL,PARENT_MOBILE\n" +
  "25JJ1A0501,AADITH KUMAR,Prakash Rao,male,9876543210,12-05-2005,aadith.k@jntuhcej.ac.in,9440123456\n";

const MINIMAL_HINTS: Array<[string, string]> = [
  ["HTNO", "Required — the 10-char hall-ticket/roll number (yyJJVVBBNN). Drives year, batch and branch automatically."],
  ["STUDENT_NAME", "Required — full name."],
  ["FATHER/GUARDIAN_NAME", "Optional — father / guardian name (the slash in the header is fine)."],
  ["GENDER", "male / female (M, F accepted)."],
  ["MOBILE", "Student 10-digit mobile."],
  ["DOB", "DD-MM-YYYY or YYYY-MM-DD."],
  ["EMAIL", "Required — valid email. Used for login + de-dup."],
  ["PARENT_MOBILE", "Optional — parent contact number."],
];

function downloadCsv(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function BulkUserImportModal({ onClose, onSuccess }: BulkUserImportModalProps) {
  const api = useApi();

  const [csvText, setCsvText] = useState("");
  const [busy, setBusy] = useState<"idle" | "commit">("idle");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  /** The final per-row report, kept so the modal stays open and shows the outcome. */
  const [report, setReport] = useState<BulkImportReport | null>(null);
  /** B7: per-row enrollment codes for freshly imported students (from the commit response). */
  const [reportBootstrapCodes, setReportBootstrapCodes] = useState<Array<{ row: number; roll: string | null; code: string }> | null>(null);

  const runValidate = async (): Promise<PreviewState | null> => {
    const res = await fetch("/api/users/bulk/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...api.getHeaders() },
      body: JSON.stringify({ csv: csvText }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) return null;
    const d = json.data ?? json;
    return {
      summary: {
        total: d.summary?.total ?? 0,
        valid: d.summary?.valid ?? 0,
        invalid: d.summary?.invalid ?? 0,
        skipped: d.summary?.skipped ?? 0,
      },
      errors: (d.errors ?? []) as PreviewError[],
      skippedRows: d.skippedRows ?? [],
      importedBefore: d.importedBefore ?? 0,
    };
  };

  const handleImport = async () => {
    setBusy("commit");
    try {
      const res = await fetch("/api/users/bulk/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...api.getHeaders() },
        body: JSON.stringify({ csv: csvText, skipErrors: true }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const d = json.data ?? json;
        const rpt: BulkImportReport = d.report ?? { totalRows: 0, imported: 0, skipped: 0, invalid: 0, rows: [] };
        setReport(rpt);
        setReportBootstrapCodes(d.bootstrapCodes ?? []);
        setPreview(null);
        onSuccess();
      } else {
        setReport({
          totalRows: 0,
          imported: 0,
          skipped: 0,
          invalid: 0,
          rows: [{ row: 0, status: "invalid", reason: json.error?.message || "Import failed" }],
        });
        setReportBootstrapCodes(null);
      }
    } catch (err: any) {
      setReport({
        totalRows: 0,
        imported: 0,
        skipped: 0,
        invalid: 0,
        rows: [{ row: 0, status: "invalid", reason: err.message || "Network error during bulk import" }],
      });
      setReportBootstrapCodes(null);
    } finally {
      setBusy("idle");
    }
  };

  const buildReportCsv = (r: BulkImportReport, codes?: Array<{ row: number; roll: string | null; code: string }> | null): string => {
    const codeByRow = new Map((codes ?? []).map((c) => [c.row, c.code]));
    const header = ["row", "roll", "name", "email", "status", "reason", "bootstrap_code"];
    const lines = [header.join(",")];
    for (const row of r.rows) {
      const cells = [
        String(row.row),
        row.roll ?? "",
        row.name ?? "",
        row.email ?? "",
        row.status,
        row.reason,
        codeByRow.get(row.row) ?? "",
      ];
      lines.push(cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
    }
    return lines.join("\n");
  };

  const downloadReport = () => {
    if (!report) return;
    downloadCsv(
      buildReportCsv(report, reportBootstrapCodes),
      `bulk_import_report_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-6 w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ maxWidth: report ? "38rem" : "56rem" }}>
        <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-sky-400" /> Bulk Student Import
          </h3>
          <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!report && (
          <>
            <div className="text-xs text-[var(--text-muted)] space-y-1">
              <p>
                Upload the college sheet (<code>8 columns</code> minimal, or up to 35).
                HTNO drives year, batch and branch — <b>everything else is captured as-is.</b>
              </p>
              <p>
                <b>New / re-upload:</b> rows whose roll already exists are <span className="text-amber-400">skipped</span> (never updated).
                Only empty-field / required-field problems mark a row as <span className="text-rose-400">invalid</span>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer px-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-xs font-semibold hover:bg-[var(--bg-base)] flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" /> Choose CSV File
                <input type="file" accept=".csv" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => { setCsvText(ev.target?.result as string); setPreview(null); };
                  reader.readAsText(file);
                }} className="hidden" />
              </label>

              <button
                type="button"
                onClick={() => downloadCsv(MINIMAL_CSV, "student_import_template.csv")}
                className="px-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-xs font-semibold hover:bg-[var(--bg-base)] text-sky-400 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download Template
              </button>

              <button
                type="button"
                onClick={() => { setCsvText(MINIMAL_CSV); setPreview(null); }}
                className="px-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-xs font-semibold hover:bg-[var(--bg-base)] text-purple-400 flex items-center gap-1.5"
              >
                <ScrollText className="w-3.5 h-3.5" /> Load Sample
              </button>
            </div>

            <textarea
              rows={7}
              placeholder={"HTNO,STUDENT_NAME,FATHER/GUARDIAN_NAME,GENDER,MOBILE,DOB,EMAIL,PARENT_MOBILE\n25JJ1A0501,AADITH KUMAR,Prakash Rao,male,9876543210,12-05-2005,aadith.k@jntuhcej.ac.in,9440123456"}
              value={csvText}
              onChange={(e) => { setCsvText(e.target.value); setPreview(null); }}
              className="w-full font-mono text-xs p-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl text-white focus:outline-none"
            />

            {preview && preview.summary.total > 0 && (
              <div className="p-3 rounded-lg text-xs space-y-2 bg-[var(--bg-base)] border border-[var(--border)]">
                <div className="flex gap-4 font-semibold">
                  <span>{preview.summary.total} rows</span>
                  <span className="text-emerald-400">{preview.summary.valid} importable</span>
                  <span className="text-amber-400">{preview.summary.skipped} already in DB</span>
                  <span className={preview.summary.invalid ? "text-rose-400" : ""}>{preview.summary.invalid} invalid</span>
                </div>
                {preview.skippedRows.length > 0 && (
                  <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-amber-200">
                    <b>{preview.skippedRows.length}</b> row(s) match existing students — they will be skipped (no update).
                    {preview.skippedRows.slice(0, 5).map((s) => (
                      <div key={s.roll} className="pl-2 text-amber-300/80">row {s.row} · {s.roll}{s.name ? ` (${s.name})` : ""}</div>
                    ))}
                    {preview.skippedRows.length > 5 && <div className="pl-2 text-amber-300/60">… and {preview.skippedRows.length - 5} more</div>}
                  </div>
                )}
                {preview.errors.length > 0 && (
                  <div className="max-h-28 overflow-y-auto space-y-1">
                    {preview.errors.slice(0, 10).map((er, i) => (
                      <div key={i} className="text-rose-400">
                        Row {er.row}{er.field ? ` (${er.field})` : ""}: {er.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button onClick={onClose} className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-white font-medium">Cancel</button>
              <button
                type="button"
                onClick={handleImport}
                disabled={busy !== "idle" || !csvText.trim()}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {busy === "commit" ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing…</> : "Run Import"}
              </button>
            </div>
          </>
        )}

        {report && (
          <div className="space-y-3">
            <div className="text-xs text-[var(--text-muted)]">
              Import finished. The modal stays open so you can review and download the report.
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
              <div className="rounded-lg p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{report.imported} imported</div>
              <div className="rounded-lg p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400">{report.skipped} skipped (already in DB)</div>
              <div className="rounded-lg p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400">{report.invalid} invalid</div>
            </div>

            <button
              type="button"
              onClick={downloadReport}
              className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-xs font-semibold hover:bg-[var(--bg-base)] text-sky-400 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Report CSV (imported + not-imported)
            </button>

            {reportBootstrapCodes && reportBootstrapCodes.length > 0 && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs space-y-1">
                <div className="font-semibold text-emerald-400">
                  {reportBootstrapCodes.length} one-time setup code(s) issued — hand each to the student so they
                  can activate at <code className="font-mono">/bootstrap?code=…</code>
                </div>
                <div className="text-[var(--text-muted)]">
                  Each code is shown once and stored hashed (in <code>enrollment_codes</code>). It is not
                  recoverable later, so copy it into the CSV before closing this dialog.
                </div>
                <pre className="text-[11px] leading-5 bg-[var(--bg-base)] rounded p-2 overflow-x-auto">
{reportBootstrapCodes.map((c) => `row ${c.row}  ${c.roll ?? ""}  ${c.code}`).join("\n")}
                </pre>
              </div>
            )}

            <div className="max-h-64 overflow-y-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[var(--bg-base)] text-[var(--text-muted)]">
                  <tr>
                    <th className="p-2 text-left">Row</th>
                    <th className="p-2 text-left">Roll</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Reason</th>
                    <th className="p-2 text-left">Setup code</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r) => {
                    const codeEntry = reportBootstrapCodes?.find((c) => c.row === r.row);
                    return (
                      <tr key={r.row} className="border-t border-[var(--border)]">
                        <td className="p-2 text-[var(--text-muted)]">{r.row}</td>
                        <td className="p-2 font-mono">{r.roll || "—"}</td>
                        <td className="p-2">{r.name || "—"}</td>
                        <td className="p-2">
                          {r.status === "imported" && <span className="text-emerald-400 font-semibold">Imported</span>}
                          {r.status === "skipped" && <span className="text-amber-400 font-semibold">Already in DB</span>}
                          {r.status === "invalid" && <span className="text-rose-400 font-semibold">Invalid</span>}
                        </td>
                        <td className="p-2 text-[var(--text-muted)]">{r.reason}</td>
                        <td className="p-2 font-mono">{codeEntry?.code ?? ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-white font-medium">Close</button>
              <button
                type="button"
                onClick={() => { setReport(null); setPreview(null); setCsvText(""); setReportBootstrapCodes(null); }}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg"
              >
                Import Another File
              </button>
            </div>
          </div>
        )}

        {!report && (
          <details className="text-xs text-[var(--text-muted)]">
            <summary className="cursor-pointer font-semibold">Column reference</summary>
            <div className="mt-2 space-y-2">
              <p className="font-semibold text-[var(--text)]">Minimal 8-column sheet</p>
              <ul className="space-y-1 pl-4 list-disc">
                {MINIMAL_HINTS.map(([k, v]) => (
                  <li key={k}><b>{k}</b> — {v}</li>
                ))}
              </ul>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
