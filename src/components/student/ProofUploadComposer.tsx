"use client";

import { useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { clearCache } from "@/hooks/useApiResource";
import { FileUp, UploadCloud, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface ProofUploadComposerProps {
  onSuccess?: () => void;
  ticketList?: string[];
}

export function ProofUploadComposer({
  onSuccess,
  ticketList = [],
}: ProofUploadComposerProps) {
  const { addToast } = useUIStore();
  const [open, setOpen] = useState(false);
  const [ticket, setTicket] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket.trim() || !file) {
      addToast({
        variant: "warning",
        title: "Required information missing",
        message: "Please enter a valid ticket number and select a PDF or image file.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`/api/permissions/${encodeURIComponent(ticket.trim())}/upload`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: fd,
      });

      const body = await res.json().catch(() => null);
      if (res.ok && body?.success) {
        addToast({
          variant: "success",
          title: "Proof uploaded",
          message: `Document linked to pass ticket #${ticket.trim()}`,
        });
        clearCache("/api/passes");
        clearCache("/api/student/dashboard");
        setFile(null);
        setTicket("");
        setOpen(false);
        onSuccess?.();
      } else {
        addToast({
          variant: "error",
          title: "Upload failed",
          message: body?.error?.message ?? "Unable to upload supporting document.",
        });
      }
    } catch {
      addToast({
        variant: "error",
        title: "Network error",
        message: "Could not upload document. Please check file format and network.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="surface-card bg-bg-surface rounded-xl border border-border p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <FileUp className="w-4 h-4 text-action-primary" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Proof Upload Composer
            </h3>
            <p className="text-xs text-text-muted">
              Attach medical certificate, parental letter, or exam slip.
            </p>
          </div>
        </div>
        <span className="p-1 rounded-md text-text-muted hover:bg-bg-elevated transition-colors">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Pass Ticket # *
              </label>
              {ticketList.length > 0 ? (
                <select
                  value={ticket}
                  onChange={(e) => setTicket(e.target.value)}
                  className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-action-primary"
                >
                  <option value="">Select ticket…</option>
                  {ticketList.map((t) => (
                    <option key={t} value={t}>
                      Ticket #{t}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="e.g. TKT-2026-10492"
                  value={ticket}
                  onChange={(e) => setTicket(e.target.value)}
                  className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-action-primary"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Document File (PDF / PNG / JPG, max 10MB) *
              </label>
              <input
                type="file"
                required
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="surface-card w-full bg-bg-base px-3 py-1 text-xs text-text-primary rounded-lg border border-border file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-bg-elevated file:text-text-secondary cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-action-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50 transition-opacity"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" /> Upload Document
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default ProofUploadComposer;
