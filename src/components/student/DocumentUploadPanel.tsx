"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, FileText, Download, Replace, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/uiStore";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import type { PermissionStatus } from "@/lib/types";

export interface DocumentUploadPanelProps {
  ticketNumber: string;
  workflowType: "exam" | "memo";
  currentStage: string;
  status: PermissionStatus;
  documentUrl?: string | null;
  onUploaded?: () => void;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const UPLOADABLE_STAGES = new Set(["oie", "vice_principal", "principal"]);

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * DocumentUploadPanel — lets the student upload (or replace) the PDF for an
 * exam/memo request while it is PENDING past HOD approval (OIE → VP → Principal).
 * Renders nothing when the workflow/stage/status don't allow an upload and no
 * document exists yet to download.
 */
export function DocumentUploadPanel({
  ticketNumber,
  workflowType,
  currentStage,
  status,
  documentUrl,
  onUploaded,
}: DocumentUploadPanelProps) {
  const authHeaders = useAuthHeaders();
  const addToast = useUIStore((s) => s.addToast);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);

  const isExamMemo = workflowType === "exam" || workflowType === "memo";
  const canUpload = isExamMemo && status === "PENDING" && UPLOADABLE_STAGES.has(currentStage);
  const hasDoc = Boolean(documentUrl);

  // Render nothing when there is nothing to show.
  if (!isExamMemo || (!hasDoc && !canUpload)) return null;

  const docHref = `/api/permissions/${encodeURIComponent(ticketNumber)}/document`;
  const showDropzone = canUpload && (!hasDoc || replaceMode);

  const pickFile = (f: File | null | undefined) => {
    setError(null);
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("File must be 10 MB or smaller.");
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const reset = () => {
    setFile(null);
    setReplaceMode(false);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/permissions/${encodeURIComponent(ticketNumber)}/upload`, {
        method: "POST",
        headers: authHeaders, // no Content-Type — browser sets the multipart boundary
        body: fd,
      });
      const json = await res.json().catch(() => null);
      if (json?.success) {
        addToast({ message: "Document uploaded successfully.", variant: "success", title: "Uploaded" });
        reset();
        onUploaded?.();
      } else {
        setError(json?.error?.message || "Upload failed. Please try again.");
      }
    } catch {
      setError("Network error while uploading.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Existing document: download + optional replace */}
      {hasDoc && !showDropzone && (
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={docHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--action-primary)] hover:underline"
          >
            <Download className="w-3.5 h-3.5" />
            Download current PDF
          </a>
          {canUpload && (
            <Button size="sm" variant="secondary" onClick={() => setReplaceMode(true)}>
              <Replace className="w-3.5 h-3.5 mr-1" />
              Replace
            </Button>
          )}
        </div>
      )}

      {/* Dropzone */}
      {showDropzone && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
            dragging
              ? "border-[var(--action-primary)] bg-[var(--action-primary)]/5"
              : "border-[var(--border)] bg-[var(--bg-base)] hover:border-[var(--text-muted)]"
          }`}
        >
          <UploadCloud className="w-8 h-8 text-[var(--text-muted)]" />
          <p className="text-xs font-semibold text-[var(--text-secondary)]">
            Drag &amp; drop a PDF here, or click to browse
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">PDF only — max 10 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>
      )}

      {/* Selected file preview */}
      {showDropzone && file && (
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{file.name}</span>
            <span className="text-[10px] text-[var(--text-muted)] shrink-0">{formatSize(file.size)}</span>
          </div>
          <button
            type="button"
            onClick={reset}
            className="p-1 rounded hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            aria-label="Remove selected file"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-500 font-medium">{error}</p>
        </div>
      )}

      {/* Upload / cancel actions */}
      {showDropzone && (
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleUpload} disabled={!file || uploading} loading={uploading}>
            {!uploading && <UploadCloud className="w-3.5 h-3.5 mr-1" />}
            {uploading ? "Uploading..." : "Upload"}
          </Button>
          {hasDoc && (
            <Button size="sm" variant="ghost" onClick={reset} disabled={uploading}>
              Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );


}
export default DocumentUploadPanel;
