"use client";

import { useState } from "react";
import { Upload, FileSpreadsheet, Download, Loader2, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { CsvValidationPreview } from "@/components/admin/CsvValidationPreview";
import { useApi } from "@/hooks/useApi";
import { getAuthHeaders } from "@/lib/utils";
import type { Role } from "@/lib/types";

/**
 * Admin → Students → Bulk Import.
 *
 * CSV student provisioning via the two-phase `/api/users/bulk/*` flow:
 * validate (dry-run, no writes) → preview → commit (with skip-errors).
 * Existing-roll rows are classified "skipped" by the backend, so bulk
 * import never overwrites an existing student (roll immutability).
 */

const STUDENT_TEMPLATE = `NAME OF THE STUDENT,EMAIL ID,role,H.T NO.,COURSE,FATHER NAME,DOB,PHONE NUMBER,GENDER
Arjun Kumar,arjun.kumar@college.edu,student,24JJ1A0501,CSE,M Raj Kumar,2006-02-14,+919****3211,Male
Meera Nair,meera.nair@college.edu,student,24JJ2B0774,BIOE,M S Nair,2005-11-02,+919****8821,Female`;

export default function AdminStudentsImportPage() {
  const api = useApi();
  const [csvText, setCsvText] = useState("");
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [validationResult, setValidationResult] = useState<unknown>(null);
  const [commitResult, setCommitResult] = useState<unknown>(null);
  const [skipErrors, setSkipErrors] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const headers = getAuthHeaders();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setValidationResult(null);
    setCommitResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText((ev.target?.result as string) || "");
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([STUDENT_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "students_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleValidate = async () => {
    if (!csvText.trim()) return setErrorMsg("Paste or upload a CSV first.");
    setValidating(true);
    setErrorMsg(null);
    setValidationResult(null);
    setCommitResult(null);
    try {
      const res = await fetch("/api/users/bulk/validate", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) setErrorMsg(json.error?.message || "Validation failed.");
      else setValidationResult(json.data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error.");
    } finally {
      setValidating(false);
    }
  };

  const handleCommit = async () => {
    if (!csvText.trim()) return;
    setCommitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/users/bulk/commit", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, skipErrors }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) setErrorMsg(json.error?.message || "Import failed.");
      else {
        setCommitResult(json.data);
        setValidationResult(null);
        setCsvText("");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error.");
    } finally {
      setCommitting(false);
    }
  };

  return (
      <div className="max-w-5xl mx-auto p-4 sm:p-4 sm:p-4 sm:p-6 space-y-4 sm:space-y-4 sm:space-y-6">
        <PageHeader
          title="Student Bulk Import"
          subtitle="CSV provisioning with two-phase validation. The role column is read from the CSV; existing students are skipped, never overwritten."
        />
        <WidgetBoundary title="Student Bulk Import">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-4">
              <div>
                <h3 className="text-base font-semibold">CSV Student Provisioning</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Dry-run first, review the preview, then commit. Rows whose roll already exists are marked
                  skipped.
                </p>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg glass-card hover:bg-[var(--bg-elevated)]"
              >
                <Download className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                Student template
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[color-mix(in_srgb,var(--action-danger)_12%,transparent)] border border-[var(--action-danger)]/20 text-xs text-[var(--action-danger)]">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="glass-card p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  CSV input
                </label>
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
              </div>

              <textarea
                rows={4}
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  setValidationResult(null);
                  setCommitResult(null);
                }}
                placeholder="Paste student CSV, or upload a .csv file"
                className="w-full font-mono text-xs p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--action-primary)]"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Pin the role column to <code className="text-[var(--action-primary)]">student</code> in the CSV.
                </span>
                <button
                  onClick={handleValidate}
                  disabled={validating || !csvText.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--action-primary)] text-white hover:opacity-90 disabled:opacity-50"
                >
                  {validating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  )}
                  Validate &amp; preview
                </button>
              </div>
            </div>

            <CsvValidationPreview
              validationResult={validationResult}
              commitResult={commitResult}
              committing={committing}
              skipErrors={skipErrors}
              setSkipErrors={setSkipErrors}
              onCommit={handleCommit}
            />
          </div>
        </WidgetBoundary>
      </div>

  );
}
