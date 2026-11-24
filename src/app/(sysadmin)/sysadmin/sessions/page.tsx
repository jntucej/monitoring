"use client";


import { AuthGuard } from "@/components/shared/AuthGuard";
import { ActiveSessions } from "@/components/sysadmin/ActiveSessions";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function ActiveSessionsPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      <ContextSituationBar
        roleLabel="System Admin"
        purpose="Manage and monitor sessions for campus operations."
        contextLabel="Sessions"
        statusSummary="Review current sessions state and take action below."
        primaryAction={{ label: "SysAdmin Overview", href: "/sysadmin" }}
        secondaryAction={{ label: "System Health", href: "/sysadmin/health" }}
      />
        <ActiveSessions />
      </div>
    </AuthGuard>
  );
}
