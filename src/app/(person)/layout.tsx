"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";

export default function PersonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["student", "faculty", "staff", "visitor", "worker", "parent", "admin", "sysadmin"]}>
      {children}
    </AuthGuard>
  );
}
