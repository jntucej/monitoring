"use client";

import React from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { SafeAreaAppShell } from "@/components/shared/SafeAreaAppShell";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import type { Role } from "@/lib/types";

const MESS_ALLOWED_ROLES: Role[] = ["mess_incharge", "warden", "admin", "sysadmin"];

export default function MessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={MESS_ALLOWED_ROLES}>
      <SafeAreaAppShell>
        {children}
      </SafeAreaAppShell>
      <DevContactStrip />
    </AuthGuard>
  );
}
