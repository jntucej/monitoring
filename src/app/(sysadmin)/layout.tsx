"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";

export default function SysAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["sysadmin"]}>
      {children}
    </AuthGuard>
  );
}
