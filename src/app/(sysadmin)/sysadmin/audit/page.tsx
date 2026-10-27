"use client";

<<<<<<< HEAD
export const dynamic = "force-dynamic";

=======
import { Suspense } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
import { AuditLogViewer } from "@/components/sysadmin/AuditLogViewer";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";
import { AuthGuard } from "@/components/shared/AuthGuard";

function SysadminAuditInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "sysadmin") as Role;

  return (
    <div className="space-y-6 min-w-0">
      <div>
<<<<<<< HEAD
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">Audit Telemetry & Security Logs</p>
=======
        <p className="text-2xl font-bold text-[var(--text-primary)]">Technical Audit Logs</p>
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
        <p className="text-sm text-[var(--text-muted)]">
          Real-time tracking of security operations, system configurations, and administrative
          actions. Signed in as <span className="font-mono text-slate-300">{role}</span>.
        </p>
        <p className="mt-2 text-xs text-slate-500 max-w-2xl">
          Note: technical audit trails here record <em>platform</em> actions. Institutional pass
          approvals and their reasoning are recorded in the role-owned approval workspaces —
          technical privileges do not grant institutional pass approvals.
        </p>
      </div>

      <WidgetBoundary title="Audit Log Viewer">
        <AuditLogViewer />
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function SysadminAuditPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <Suspense fallback={<PageLoading />}>
        <SysadminAuditInner />
      </Suspense>
    </AuthGuard>
  );
}
