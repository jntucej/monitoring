"use client";

import React from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { SecurityManagement } from "@/components/sysadmin/SecurityManagement";

export default function SecurityPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin"]}>
      <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Zero-Trust & Security Hardening</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Manage IP allowlists, mandatory 2FA enforcement, and active JWT user sessions.
          </p>
        </div>
        <SecurityManagement />
      </div>
    </AuthGuard>
  );
}
