"use client";

import React from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { SafeAreaAppShell } from "@/components/shared/SafeAreaAppShell";
import type { Role } from "@/lib/types";

const ALLOWED_APPROVER_ROLES: Role[] = [
  "caretaker",
  "deputy_warden",
  "hostel_manager",
  "warden",
  "principal",
  "vice_principal",
  "hod",
  "oie",
  "exam_branch",
  "faculty",
  "admin",
  "sysadmin",
];

export default function ApproverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={ALLOWED_APPROVER_ROLES}>
      <SafeAreaAppShell>
        {children}
      </SafeAreaAppShell>
    </AuthGuard>
  );
}
