"use client";

import { useState } from "react";
import { Upload, X, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";

interface BulkUserImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkUserImportModal({ onClose, onSuccess }: BulkUserImportModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [busy, setBusy] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const parseCSV = (csv: string) => {
    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || "";
      });
      records.push(obj);
    }
    return records;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (file.name.endsWith(".csv")) {
        const parsed = parseCSV(content);
        setJsonText(JSON.stringify(parsed, null, 2));
      } else {
        setJsonText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setBusy(true);
    setResultMsg(null);

    try {
      let usersList;
      try {
        usersList = JSON.parse(jsonText);
      } catch {
        setResultMsg({ type: "error", text: "Invalid JSON or CSV format. Ensure text is valid JSON or upload a CSV." });
        setBusy(false);
        return;
      }

      const res = await fetch("/api/users/bulk", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ users: usersList }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setResultMsg({
          type: "success",
          text: `Bulk import completed! Succeeded: ${json.succeeded}, Failed: ${json.failed}`,
        });
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setResultMsg({ type: "error", text: json.error?.message || "Bulk import failed." });
      }
    } catch (err: any) {
      setResultMsg({ type: "error", text: err.message || "Network error during bulk import" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-sky-400" /> Bulk User Import
          </h3>
          <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[var(--text-muted)]">
          Upload a CSV file or paste JSON array containing user objects with columns: <code>name, email, role</code> (optional: <code>employeeId, phone</code>).
        </p>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer px-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-xs font-semibold hover:bg-[var(--bg-base)] flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-400" /> Choose CSV / JSON File
            <input type="file" accept=".csv,.json" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        <textarea
          rows={7}
          placeholder='[{"name": "Alice Smith", "email": "alice@college.edu", "role": "operator"}]'
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          className="w-full font-mono text-xs p-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl text-white focus:outline-none"
        />

        {resultMsg && (
          <div className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${resultMsg.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
            {resultMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{resultMsg.text}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-white font-medium">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={busy || !jsonText.trim()}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg disabled:opacity-50"
          >
            {busy ? "Importing..." : "Start Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
