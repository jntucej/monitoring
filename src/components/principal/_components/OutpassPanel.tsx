"use client";

/* ── OutpassLeavePanel ── */

import { memo } from "react";
import { ClipboardCheck } from "lucide-react";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import type { OutpassRow } from "./types";

export const OutpassLeavePanel = memo(function OutpassLeavePanel({
  outpasses,
  leaves,
  loading,
  error: _error,
}: {
  outpasses: OutpassRow[] | null;
  leaves: OutpassRow[] | null;
  loading: boolean;
  error: string | null;
}) {
  const all = [...(outpasses ?? []), ...(leaves ?? [])];
  return (
    <PrincipalWidgetBoundary title="Outpass and Leave Requests">
      <div className="surface-card bg-bg-surface p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 text-text-muted mb-3">
          <ClipboardCheck className="w-4 h-4 text-action-warning" />
          <span className="text-xs font-semibold uppercase tracking-wide">Outpass &amp; Leave Requests</span>
          {all.length > 0 && <span className="text-xs text-action-warning ml-auto">{all.length} pending</span>}
        </div>
        {loading && !outpasses && !leaves ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : all.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">No pending outpass or leave requests.</p>
        ) : (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-sm min-w130">
              <thead>
                <tr className="text-text-muted text-xs uppercase tracking-wide border-b border-border">
                  <th className="text-left px-3 py-2">Ticket</th>
                  <th className="text-left px-3 py-2">Student</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Stage</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {all.slice(0, 15).map((r) => (
                  <tr key={r.id} className="hover:bg-bg-elevated">
                    <td className="px-3 py-2 font-mono text-xs text-text-primary whitespace-nowrap">{r.ticket_number}</td>
                    <td className="px-3 py-2 text-text-primary min-w-0">
                      {r.student?.name || "—"}
                      {r.student?.student_details?.roll ? ` · ${r.student.student_details.roll}` : ""}
                    </td>
                    <td className="px-3 py-2 text-text-muted capitalize whitespace-nowrap">{r.workflow_type.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.current_stage || "—"}</td>
                    <td className="px-3 py-2">
                      <span className="surface-card inline-block px-2 py-0.5 text-xs font-medium bg-amber-400/10 text-action-warning whitespace-nowrap">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PrincipalWidgetBoundary>
  );
});
