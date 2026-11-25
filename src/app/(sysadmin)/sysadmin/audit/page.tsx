"use client";

import { Suspense } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

import { AuditLogViewer } from "@/components/sysadmin/AuditLogViewer";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

function SysadminAuditInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "sysadmin") as Role;

  return (
    <div className="space-y-6 min-w-0">
      <ContextSituationBar
        roleLabel="System Admin"
        contextLabel="Security & Administrative Audit"
        purpose="Inspect immutable chronological event logs across authentication events, role grants, configuration changes, and gate actions."
        statusSummary="Cryptographically verified audit trail actively recording administrative mutations and perimeter security operations."
        why="Unbreakable audit trails protect against insider tampering, substantiate disciplinary inquiries, and satisfy legal compliance mandates."
        primaryAction={{ label: "SysAdmin Overview", href: "/sysadmin" }}
        secondaryAction={{ label: "Access Governance", href: "/sysadmin/access" }}
      />
      <div>
        <p className="text-2xl font-bold text-text-primary">Technical Audit Logs</p>
        <p className="text-sm text-text-muted">
          Real-time tracking of security operations, system configurations, and administrative
          actions. Signed in as <span className="font-mono text-text-secondary">{role}</span>.
        </p>
        <p className="mt-2 text-xs text-text-muted max-w-2xl">
          Note: technical audit trails here record <em>platform</em> actions. Institutional pass
          approvals and their reasoning are recorded in the role-owned approval workspaces —
          technical privileges do not grant institutional pass approvals.
        </p>
      </div>

      <div className="section-offscreen">
      <WidgetBoundary title="Audit Log Viewer">
        <AuditLogViewer />
      </WidgetBoundary>
      </div>

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
