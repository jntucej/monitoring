"use client";

import { useState } from "react";
import {
  Upload, X, CheckCircle2, AlertTriangle, FileText, Loader2, ScrollText,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";

interface BulkUserImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface PreviewError {
  row: number;
  field?: string;
  message: string;
}

interface PreviewSummary {
  total: number;
  valid: number;
  invalid: number;
}

// 35-column college bulk-import sheet. H.T NO. (roll) drives year / batch /
// branch / course — everything else is captured as-is; year is calculated,
// never typed.
const TEMPLATE_CSV =
  "COURSE,DEPARTMENT,BRANCH,SEMESTER,REGULATION,YEAR,HTNO,STUDENT_NAME,GENDER,MOBILE,EMAIL,DOB,IDENTIFICATION_MARKS_1,IDENTIFICATION_MARKS_2,BLOOD_GROUP,NATIONALITY,RELIGION,CASTE,SUBCASTE,PH_STATUS,FATHER_GUARDIAN_NAME,MOTHER_NAME,PARENT_MOBILE,PARENT_EMAIL,ADDRESS,CITY,DISTRICT,STATE,PINCODE,FATHER_OCCUPATION,INCOME_PER_ANNUM,EAMCET_HTNO,EAMCET_ECET_RANK,ADMISSION_DATE,ADMISSION_CATEGORY\n" +
  "B-Tech,CS,CSE,3,1,2,25JJ1A0501,AADITH KUMAR,male,9876543210,aadith.k@jntuhcej.ac.in,12-05-2005,Left mole,Scars,None,Indian,Hindu,BC,Other,none,Prakash Rao,Lakshmi Rao,9440123456,rao.prakash@example.com,123 Main Road,Hyderabad,Hyderabad,TS,500001,Teacher,250000,EAM250001,4523,01-07-2025,Open\n";

const TEMPLATE_HINTS: Array<[string, string]> = [
  // Academic
  ["Academic — COURSE", "B-Tech (4-year programme) or M-Tech (2-year programme). Year is capped at the course duration; if blank, it falls back to the branch code in HTNO (05 CSE, 12 IT, 04 ECE, 02 EEE, 03 MECH)."],
  ["Academic — DEPARTMENT / BRANCH", "Department abbreviation (CS, IT, ECE, EEE, MECH) and branch code (CSE, CDA, IT, ECE, EEE, MECH, CSE-AI)."],
  ["Academic — SEMESTER / REGULATION / YEAR", "Semester number (1–8), academic regulation code, and academic year. Computed from HTNO when omitted."],
  ["Academic — HTNO", "Required student field — yyJJVVBBNN. Year, batch and branch are calculated from it (1A = regular, 5A = lateral)."],
  // Identity
  ["Identity — STUDENT_NAME", "Full name as on the degree certificate. Required."],
  ["Identity — GENDER", "male / female (M, F also accepted)."],
  ["Identity — MOBILE", "10-digit student mobile number."],
  ["Identity — EMAIL", "Required. Missing or invalid email = row is reported and skipped."],
  ["Identity — DOB", "DD-MM-YYYY or YYYY-MM-DD."],
  ["Identity — BLOOD_GROUP / NATIONALITY / RELIGION / CASTE / SUBCASTE / PH_STATUS", "All optional. CASTE: SC / ST / BC / Other. PH_STATUS: Y / N or description."],
  // Identification marks
  ["Identification marks — IDENTIFICATION_MARKS_1 / _2", "Physical identification details (left mole, scar, etc.). Optional."],
  // Family
  ["Family — FATHER_GUARDIAN_NAME / MOTHER_NAME", "Full names. Required for registration."],
  ["Family — PARENT_MOBILE / PARENT_EMAIL", "Primary parent contact. PARENT_MOBILE required; PARENT_EMAIL optional."],
  ["Family — FATHER_OCCUPATION / INCOME_PER_ANNUM", "Occupation and annual family income in INR. Required for fee waivers / categories."],
  // Address
  ["Address — ADDRESS / CITY / DISTRICT / STATE / PINCODE", "Residential address. STATE is a 2-letter code (TS, AP, …). PINCODE is a 6-digit code."],
  // Admission
  ["Admission — ADMISSION_DATE / ADMISSION_CATEGORY", "Date of admission (DD-MM-YYYY) and category (Open / SC / ST / BC / EWS / Minorities)."],
  ["Admission — EAMCET_HTNO / EAMCET_ECET_RANK", "EAMCET hall-ticket number and ECET rank. Optional; used for counselling audit."],
];

export function BulkUserImportModal({ onClose, onSuccess }: BulkUserImportModalProps) {
  const [csvText, setCsvText] = useState("");
  const [busy, setBusy] = useState<"idle" | "validate" | "commit">("idle");
  const [resultMsg, setResultMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [preview, setPreview] = useState<{
    summary: PreviewSummary;
    errors: PreviewError[];
    rows: unknown[];
  } | null>(null);

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "student_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      setPreview(null);
      setResultMsg(null);
    };
    reader.readAsText(file);
  };

  const runValidate = async (): Promise<unknown[] | null> => {
    const res = await fetch("/api/users/bulk/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ csv: csvText }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setResultMsg({ type: "error", text: json.error?.message || "Validation request failed." });
      return null;
    }
    const data = json.data ?? json;
    setPreview({
      summary: data.summary ?? { total: data.totalRows ?? 0, valid: data.validRows?.length ?? 0, invalid: data.errors?.length ?? 0 },
      errors: data.errors ?? [],
      rows: data.validRows ?? [],
    });
    return data.validRows;
  };

  const handleImport = async () => {
    setBusy("validate");
    setResultMsg(null);
    try {
      const validRows = await runValidate();
      if (validRows === null) {
        // Validation itself failed (shown in resultMsg) — abort commit.
        setBusy("idle");
        return;
      }
      setBusy("commit");
      const res = await fetch("/api/users/bulk/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ rows: validRows, skipErrors: true }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const d = json.data ?? json;
        const errs: string[] = (d.errors ?? []).map((x: any) => `row ${x.row}: ${x.error}`).slice(0, 5);
        setResultMsg({
          type: "success",
          text: `Import complete — ${d.importedCount} imported, ${d.failedCount} failed.` +
            (errs.length ? ` ${errs.join(" • ")}` : ""),
        });
        setTimeout(() => {
          onSuccess();
        }, 2500);
      } else {
        setResultMsg({ type: "error", text: json.error?.message || "Commit failed." });
      }
    } catch (err: any) {
      setResultMsg({ type: "error", text: err.message || "Network error during bulk import" });
    } finally {
      setBusy("idle");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-sky-400" /> Bulk Student Import
          </h3>
          <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-[var(--text-muted)] space-y-1">
          <p>
            Upload the college sheet (<code>35 columns</code>).
            HTNO drives year, batch and branch — <b>everything else is captured as-is.</b>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer px-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-xs font-semibold hover:bg-[var(--bg-base)] flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-400" /> Choose CSV File
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            type="button"
            onClick={downloadTemplate}
            className="px-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-xs font-semibold hover:bg-[var(--bg-base)] text-sky-400 flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 rotate-180" /> Download Template
          </button>

          <button
            type="button"
            onClick={() => setCsvText(TEMPLATE_CSV)}
            className="px-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-xs font-semibold hover:bg-[var(--bg-base)] text-purple-400 flex items-center gap-1.5"
          >
            <ScrollText className="w-3.5 h-3.5" /> Load Sample
          </button>
        </div>

        <textarea
          rows={7}
          placeholder={"COURSE,DEPARTMENT,BRANCH,SEMESTER,REGULATION,YEAR,HTNO,STUDENT_NAME,GENDER,MOBILE,EMAIL,DOB,…\nB-Tech,CS,CSE,3,1,2,25JJ1A0501,AADITH KUMAR,male,9876543210,aadith.k@jntuhcej.ac.in,12-05-2005,…"}
          value={csvText}
          onChange={(e) => { setCsvText(e.target.value); setPreview(null); }}
          className="w-full font-mono text-xs p-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl text-white focus:outline-none"
        />

        {preview && preview.summary.total > 0 && (
          <div className="p-3 rounded-lg text-xs space-y-2 bg-[var(--bg-base)] border border-[var(--border)]">
            <div className="flex gap-4 font-semibold">
              <span>{preview.summary.total} rows</span>
              <span className="text-emerald-400">{preview.summary.valid} valid</span>
              <span className={preview.summary.invalid ? "text-rose-400" : ""}>{preview.summary.invalid} invalid</span>
            </div>
            {preview.errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {preview.errors.slice(0, 10).map((er, i) => (
                  <div key={i} className="text-rose-400">
                    Row {er.row}{er.field ? ` (${er.field})` : ""}: {er.message}
                  </div>
                ))}
                {preview.errors.length > 10 && <div className="text-[var(--text-muted)]">… and {preview.errors.length - 10} more</div>}
              </div>
            )}
          </div>
        )}

        {resultMsg && (
          <div className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${resultMsg.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
            {resultMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{resultMsg.text}</span>
          </div>
        )}

        <details className="text-xs text-[var(--text-muted)]">
          <summary className="cursor-pointer font-semibold">Column reference</summary>
          <div className="mt-2 space-y-3">
            {(() => {
              const groups: Record<string, Array<[string, string]>> = {};
              for (const [k, v] of TEMPLATE_HINTS) {
                const section = k.split(" — ")[0];
                (groups[section] ??= []).push([k, v]);
              }
              return Object.entries(groups).map(([section, hints]) => (
                <div key={section}>
                  <p className="font-semibold text-[var(--text)] mb-1">{section}</p>
                  <ul className="space-y-1 pl-4 list-disc">
                    {hints.map(([k, v]) => (
                      <li key={k}><b>{k}</b> — {v}</li>
                    ))}
                  </ul>
                </div>
              ));
            })()}
          </div>
        </details>

        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-white font-medium">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={busy !== "idle" || !csvText.trim() || (preview !== null && preview.summary.valid === 0)}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {busy === "commit" ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing…</> :
             busy === "validate" ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Validating…</> :
             `Import ${preview ? `${preview.summary.valid} students` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
