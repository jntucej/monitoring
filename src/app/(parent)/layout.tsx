"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["parent", "guardian", "admin", "sysadmin"]}>
      {children}
    </AuthGuard>
  );
}
