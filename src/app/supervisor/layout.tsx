"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";

export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["supervisor", "admin", "sysadmin"]}>
      {children}
    </AuthGuard>
  );
}
