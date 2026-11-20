/**
 * shared/documents/MyDocuments.tsx — the student's document loop: which
 * passes need a document, each doc's verified/pending/rejected status,
 * the track timeline, and re-upload-with-reason. Steps 2 (STATUS) +
 * 4 (TRACK) + 6 (ESCALATE). Reuses DocumentStatusCard per ticket.
 */

"use client";

import { useEffect, useState } from "react";
import { Loader2, FileText } from "lucide-react";
import { cn, getAuthHeaders } from "@/lib/utils";
import { DocumentStatusCard } from "@/components/shared/documents/DocumentStatusCard";

export interface DocRow {
  ticketId: string;
  ticketNumber: string;
  status: "pending" | "verified" | "rejected";
  documentUrl?: string;
  submittedAt?: string;
  verifiedAt?: string;
  reason?: string;
  /** The pass type / why a doc is needed. */
  passType?: string;
}

export interface MyDocumentsProps {
  /** Class name. */
  className?: string;
}

/** Map the permissions status → doc status. */
function toDocStatus(s: string | null | undefined): DocRow["status"] {
  const u = (s ?? "").toUpperCase();
  if (u === "REJECTED" || u === "DOC_REJECTED") return "rejected";
  if (u === "APPROVED" || u === "VERIFIED" || u === "ACTIVE" || u === "RETURNED" || u === "COMPLETED")
    return "verified";
  return "pending";
}

export function MyDocuments({ className }: MyDocumentsProps) {
  const [rows, setRows] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/permissions?scope=mine", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: any[] = data.items ?? data.data ?? (Array.isArray(data) ? data : []);
      setRows(
        list
          .filter((p) => p.documentUrl || p.document_url)
          .map((p) => ({
            ticketId: p.id,
            ticketNumber: p.ticketNumber ?? p.ticket_number ?? p.id,
            status: toDocStatus(p.status ?? p.finalStatus),
            documentUrl: p.documentUrl ?? p.document_url,
            submittedAt: p.requestedAt ?? p.requested_at ?? p.createdAt,
            verifiedAt: p.updatedAt ?? p.verifiedAt,
            passType: p.reason ?? p.workflowType,
          })),
      );
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 py-4 text-xs text-text-muted", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading documents…
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {error && <p className="text-xs text-text-muted">Could not load documents ({error}).</p>}
      {rows.length === 0 && !error && (
        <div className="flex items-center gap-2 py-4 text-xs text-text-muted">
          <FileText className="h-4 w-4" />
          No documents uploaded. When a pass needs proof (medical, ID), it shows here with its
          verification status.
        </div>
      )}
      {rows.map((row) => (
        <DocumentStatusCard
          key={row.ticketId}
          ticketId={row.ticketId}
          ticketNumber={row.ticketNumber}
          status={row.status}
          documentUrl={row.documentUrl}
          submittedAt={row.submittedAt}
          verifiedAt={row.verifiedAt}
          reason={row.reason}
        />
      ))}
    </div>
  );
}

export default MyDocuments;
