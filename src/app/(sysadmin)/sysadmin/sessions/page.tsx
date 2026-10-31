"use client";


import { AuthGuard } from "@/components/shared/AuthGuard";
import { ActiveSessions } from "@/components/sysadmin/ActiveSessions";

export default function ActiveSessionsPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <ActiveSessions />
      </div>
    </AuthGuard>
  );
}
