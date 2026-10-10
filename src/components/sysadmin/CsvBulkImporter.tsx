"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Download, Loader2, ShieldAlert } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { CsvValidationPreview } from "./CsvValidationPreview";

const SAMPLE_CSV = `NAME OF THE STUDENT,EMAIL ID,role,H.T NO.,COURSE,FATHER NAME,DOB,PHONE NUMBER,LAND LINE 0R PARENT NUMBER,GENDER\nJohn Doe,john.doe@college.edu,student,22JJ1A0501,CSE,Robert Doe,2005-01-01,+919****3211,040-123456,Male`;

export function CsvBulkImporter() {
  const [csvText, setCsvText] = useState("");
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [commitResult, setCommitResult] = useState<any>(null);
  const [skipErrors, setSkipErrors] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setValidationResult(null);
    setCommitResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText((ev.target?.result as string) || "");
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "users_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleValidate = async () => {
    if (!csvText.trim()) return setErrorMsg("Paste or upload CSV first");
    setValidating(true);
    setErrorMsg(null);
    setValidationResult(null);
    setCommitResult(null);
    try {
      const res = await fetch("/api/users/bulk/validate", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ csvText })
      });
      const json = await res.json();
      if (!res.ok || !json.success) setErrorMsg(json.error?.message || "Validation failed");
      else setValidationResult(json.data);
    } catch (err: any) {
      setErrorMsg(err.message || "Network error");
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
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, skipErrors })
      });
      const json = await res.json();
      if (!res.ok || !json.success) setErrorMsg(json.error?.message || "Import failed");
      else setCommitResult(json.data);
    } catch (err: any) {
      setErrorMsg(err.message || "Network error");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--surface-sunken)] p-4 rounded-xl border border-[var(--border-subtle)]">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">CSV Bulk User Provisioning</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Two-phase validation checking relational integrity, IDs, and gates.</p>
        </div>
        <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--surface-default)] hover:bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] shadow-sm">
          <Download className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          Template
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="bg-[var(--surface-default)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase">CSV Input</label>
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,text/csv" className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] font-medium">
              <Upload className="w-3.5 h-3.5" />
              Upload .csv
            </button>
          </div>
        </div>

        <textarea rows={4} value={csvText} onChange={(e) => { setCsvText(e.target.value); setValidationResult(null); setCommitResult(null); }} placeholder="Paste CSV: email,name,role,unique_id,..." className="w-full font-mono text-xs p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]" />

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-[var(--text-muted)]">Roles: student, faculty, staff, warden, operator, sysadmin, parent, worker</span>
          <button onClick={handleValidate} disabled={validating || !csvText.trim()} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50">
            {validating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            Validate & Preview
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
  );
}
