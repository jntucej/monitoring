"use client";

import { Suspense } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuditLogViewer } from "@/components/sysadmin/AuditLogViewer";
import { History, ShieldAlert } from "lucide-react";

function AdminAuditLogsInner() {
  return (
    <div className="space-y-6 min-w-0">
      <div>
        <p className="text-xs text-[var(--text-muted)]">
          Institutional audit trail — administrative actions, role changes, config writes and access
          events. Filtered by action, actor, and date range; exportable to CSV.
        </p>
        <p className="mt-2 text-xs text-slate-500 max-w-2xl flex items-start gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
          Audit entries are append-only. Role or permission discrepancies found in this trail should be
          escalated to the platform team — do not attempt manual corrections.
        </p>
      </div>

      <WidgetBoundary title="Audit Trail">
        <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <History className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-lg font-black text-white">Audit Trail Viewer</p>
              <p className="text-xs text-slate-500">
                Reuses the platform audit store — same records the sysadmin console reads.
              </p>
            </div>
          </div>

          <AuditLogViewer />
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function AdminAuditLogsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminAuditLogsInner />
    </Suspense>
  );
}
