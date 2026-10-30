"use client";

/* ── AuditRecords panel ── */

import { memo } from "react";
import { FileText } from "lucide-react";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import type { AuditRecord } from "./types";
import { fmtDate, fmtTime, fmtDetails } from "./types";

export const AuditRecords = memo(function AuditRecords({
  auditRecords,
  loading,
  error,
}: {
  auditRecords: AuditRecord[] | null;
  loading: boolean;
  error: string | null;
}) {
  const recent = auditRecords?.slice(0, 6) ?? [];
  return (
    <PrincipalWidgetBoundary title="Hostel Reports">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <FileText className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">Hostel Reports</span>
        </div>
        {loading && !auditRecords ? (
          <p className="text-sm text-[var(--text-muted)]">Loading…</p>
        ) : error ? (
          <p className="text-xs text-amber-300">{error}</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-4 text-center">No recent hostel report activity.</p>
        ) : (
          <ul className="space-y-2 min-w-0">
            {recent.map((r) => (
              <li key={r.id} className="min-w-0 flex items-center gap-2">
                <FileText className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                <span className="text-xs text-[var(--text-primary)] font-medium truncate min-w-0 flex-1">{r.action}</span>
                <span className="text-[10px] text-[var(--text-muted)] shrink-0">{fmtDate(r.timestamp)} {fmtTime(r.timestamp)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-[var(--text-muted)] mt-3 pt-3 border-t border-[var(--border)]">
          Authority: Manage the assigned hostel, residents, and hostel-related incidents.
        </p>
        <a
          href="/hostel/permissions"
          className="inline-flex items-center gap-1.5 mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
        >
          Open Hostel Approvals Desk →
        </a>
      </div>
    </PrincipalWidgetBoundary>
  );
});
