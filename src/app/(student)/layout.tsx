"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["student", "admin", "sysadmin"]}>
      {children}
    </AuthGuard>
  );
}
