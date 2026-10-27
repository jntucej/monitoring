"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";

export function SysAdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["sysadmin"]}>
      {children}
    </AuthGuard>
  );
}
