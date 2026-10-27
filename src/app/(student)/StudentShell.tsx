"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";

export function StudentShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["student", "admin", "sysadmin"]}>
      {children}
    </AuthGuard>
  );
}
