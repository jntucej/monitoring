"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      {children}
    </AuthGuard>
  );
}
