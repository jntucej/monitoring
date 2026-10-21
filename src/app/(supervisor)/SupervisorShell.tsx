"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";

export function SupervisorShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["supervisor", "principal", "admin", "sysadmin"]}>
      {children}
    </AuthGuard>
  );
}
