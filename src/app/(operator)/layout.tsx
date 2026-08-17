"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["operator", "admin", "sysadmin"]}>
      {children}
    </AuthGuard>
  );
}
