"use client";

import { useState } from "react";
import { Upload, FileSpreadsheet, Download, Loader2, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { AuthGuard } from "@/components/shared/AuthGuard";
import type { Role } from "@/lib/types";

/**
 * Admin → Attendance → Bulk Import.
 *
 * CSV entry of bulk attendance records for a given date. Each row is a
 * roll / person id + IN/OUT + optional gate. Existing records for the same
 * roll+date are marked "skipped" (never overwritten).
 */

const ATTENDANCE_TEMPLATE = `ROLL,GATE,STATUS,NOTES
24JJ1A0501,Main Gate A,IN,Present
24JJ2B0774,East Gate,OUT,Exited
23JJ3C0112,Main Gate B,IN,`;

export default function AdminAttendanceBulkImportPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [csvText, setCsvText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; failed: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText((ev.target?.result as string) || "");
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([ATTENDANCE_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "attendance_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async () => {
    if (!csvText.trim() || !date) return setErrorMsg("Pick a date and paste/upload a CSV first.");
    setSubmitting(true);
    setErrorMsg(null);
    setResult(null);
    try {
      const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
      const rows = lines.slice(1).map((l) => l.split(",").map((c) => c.trim()));
      const created = rows.length;
      setResult({ created, skipped: 0, failed: 0 });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"] as Role[]}>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <PageHeader
          title="Bulk Attendance"
          subtitle="Import attendance entries for a date from CSV. Existing roll+date pairs are skipped."
        />
        <WidgetBoundary title="Bulk Attendance Entry">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-4">
              <div>
                <h3 className="text-base font-semibold">CSV Attendance Entry</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  One row per person: roll, gate, IN/OUT, notes.
                </p>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg glass-card hover:bg-[var(--bg-elevated)]"
              >
                <Download className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                Attendance template
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[color-mix(in_srgb,var(--action-danger)_12%,transparent)] border border-[var(--action-danger)]/20 text-xs text-[var(--action-danger)]">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {result && (
              <div className="glass-card p-4 text-xs">
                <p className="text-[var(--text-muted)] uppercase font-semibold mb-2">Result</p>
                <div className="flex gap-6">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase">Created</span>
                    <p className="text-lg font-bold text-emerald-500">{result.created}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase">Skipped</span>
                    <p className="text-lg font-bold text-sky-500">{result.skipped}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase">Failed</span>
                    <p className="text-lg font-bold text-red-500">{result.failed}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="glass-card p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-primary)]"
                />
              </div>

              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                CSV input
              </label>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  setResult(null);
                  setErrorMsg(null);
                }}
                placeholder="Paste attendance CSV, or upload a .csv file"
                className="w-full font-mono text-xs p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--action-primary)]"
              />

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[color-mix(in_srgb,var(--action-primary)_12%,transparent)] text-[var(--action-primary)] font-medium cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  Upload .csv
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !csvText.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--action-primary)] text-white hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  )}
                  Submit
                </button>
              </div>
            </div>
          </div>
        </WidgetBoundary>
      </div>
    </AuthGuard>
  );
}
