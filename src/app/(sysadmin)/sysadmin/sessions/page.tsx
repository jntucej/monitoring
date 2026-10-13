"use client";

export const dynamic = "force-dynamic";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { ActiveSessions } from "@/components/sysadmin/ActiveSessions";

export default function ActiveSessionsPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <ActiveSessions />
      </div>
    </AuthGuard>
  );
}
