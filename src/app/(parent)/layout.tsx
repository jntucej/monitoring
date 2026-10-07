"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["parent", "admin", "sysadmin"]}>
      {children}
    </AuthGuard>
  );
}
