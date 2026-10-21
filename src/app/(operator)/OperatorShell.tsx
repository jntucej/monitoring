"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";

export function OperatorShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["operator", "worker", "admin", "sysadmin"]}>
      {children}
    </AuthGuard>
  );
}
