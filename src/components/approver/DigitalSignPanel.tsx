"use client";

import React, { useState } from "react";
import { PenTool, Download, Eye, AlertCircle, CheckCircle2, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/uiStore";
import { useApi } from "@/hooks/useApi";
import type { PermissionStatus } from "@/lib/types";

export interface DigitalSignPanelProps {
  ticketNumber: string;
  workflowType: "exam" | "memo";
  currentStage: string;
  status: PermissionStatus;
  documentUrl?: string | null;
  digitalSignature?: string | null;
  onSigned?: () => void;
}

const MAX_NOTE = 200;

/**
 * DigitalSignPanel — Principal-facing panel to digitally sign an exam/memo
 * request once the student's PDF has uploaded and the ticket sits at the
 * `principal` stage. On success the ticket flips to COMPLETED; a completed card
 * then shows the truncated signature hash and a signed-PDF download.
 */
export function DigitalSignPanel({
  ticketNumber,
  workflowType,
  currentStage,
  status,
  documentUrl,
  digitalSignature,
  onSigned,
}: DigitalSignPanelProps) {
  const addToast = useUIStore((s) => s.addToast);
  const [note, setNote] = useState("");
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExamMemo = workflowType === "exam" || workflowType === "memo";
  const docHref = `/api/permissions/${encodeURIComponent(ticketNumber)}/document`;

  const isCompleted = status === "COMPLETED" && Boolean(digitalSignature);
  const canSign =
    isExamMemo && status === "PENDING" && currentStage === "principal" && Boolean(documentUrl);
  const awaitingDoc =
    isExamMemo && status === "PENDING" && currentStage === "principal" && !documentUrl;

  if (!isExamMemo) return null;
  if (!isCompleted && !canSign && !awaitingDoc) return null;

  const handleSign = async () => {
    if (signing) return;
    setSigning(true);
    setError(null);
    try {
      const res = await fetch(`/api/permissions/${encodeURIComponent(ticketNumber)}/sign`, {
        method: "POST",
        headers: api.getHeaders(),
        body: JSON.stringify({ signatureNote: note.trim() || undefined }),
      });
      const json = await res.json().catch(() => null);
      if (json?.success) {
        addToast({ message: "Document signed successfully.", variant: "success", title: "Signed" });
        setNote("");
        onSigned?.();
      } else {
        setError(json?.error?.message || "Signing failed. Please try again.");
      }
    } catch {
      setError("Network error while signing.");
    } finally {
      setSigning(false);
    }
  };

  // Completed: show signature hash + signed download.
  if (isCompleted) {
    return (
      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
            Digitally Signed
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <Hash className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="font-mono">{String(digitalSignature).slice(0, 12)}…</span>
        </div>
        <a
          href={docHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--action-primary)] hover:underline"
        >
          <Download className="w-3.5 h-3.5" />
          Download Signed PDF
        </a>
      </div>
    );
  }

  // Awaiting the student's upload.
  if (awaitingDoc) {
    return (
      <p className="text-xs text-[var(--text-muted)] italic">
        Waiting for student to upload document.
      </p>
    );
  }

  // Ready to sign.
  return (
    <div className="space-y-3">
      <a
        href={docHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--action-primary)] hover:underline"
      >
        <Eye className="w-3.5 h-3.5" />
        Preview PDF
      </a>

      <div className="space-y-1">
        <label htmlFor="sign-note" className="text-[11px] text-[var(--text-muted)] font-medium">
          Signature note (optional)
        </label>
        <input
          id="sign-note"
          type="text"
          maxLength={MAX_NOTE}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={signing}
          placeholder="Optional note (max 200 characters)"
          className="w-full p-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:opacity-50"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-500 font-medium">{error}</p>
        </div>
      )}

      <Button size="sm" onClick={handleSign} disabled={signing} loading={signing}>
        {!signing && <PenTool className="w-3.5 h-3.5 mr-1" />}
        {signing ? "Signing..." : "Sign Digitally"}
      </Button>
    </div>
  );

}
export default DigitalSignPanel;
const api = useApi();

