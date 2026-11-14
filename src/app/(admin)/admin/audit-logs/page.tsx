"use client";

import { Suspense } from "react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/admin/shared/LoadingStates";

import { AdminAuditLogViewer } from "@/components/admin/AdminAuditLogViewer";
import { History, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

function AdminAuditLogsInner() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const roles: string[] =
    user?.roles && user.roles.length > 0
      ? user.roles
      : role
        ? [role]
        : [];
  const canViewAll = roles.includes("sysadmin");

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <p className="text-xs text-text-muted">
          Campus-split audit trail — operational campus events with infra-noise actions
          (auth, MFA, sessions, backups, retention, migrations, metrics, security, RLS)
          filtered out. Switch to the <span className="font-semibold text-text-primary">All</span> scope
          (sysadmin-only) to read the complete trail.
        </p>
        <p className="mt-2 text-xs text-text-muted max-w-2xl flex items-start gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-action-success shrink-0 mt-0.5" />
          Audit entries are append-only. Role or permission discrepancies found in this trail
          should be escalated to the platform team — do not attempt manual corrections.
        </p>
      </div>

      <div className="section-offscreen">
      <WidgetBoundary title="Audit Trail">
        <div className="surface-card bg-bg-elevated p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <History className="w-5 h-5 text-action-success" />
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-lg font-black text-white">Campus Audit Trail</p>
              <p className="text-xs text-text-muted">
                Operational events with filters and CSV export. “All” scope is sysadmin-only.
              </p>
            </div>
          </div>

          <AdminAuditLogViewer canViewAll={canViewAll} />
        </div>
      </WidgetBoundary>
      </div>

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
