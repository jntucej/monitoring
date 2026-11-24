/**
 * (student)/student/permissions/new/page.tsx — v2: uses PassCreateFormV2.
 *
 * The old PermissionRequestForm is retired; the new form is
 * persona-scoped and config-driven (PassTypeConfig).
 */

"use client";

import { FilePlus2 } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PassCreateFormV2 } from "@/components/shared/pass/PassCreateFormV2";

export default function NewPermissionPage() {
  return (
    <AuthGuard allowedRoles={["student"]}>
      <div className="p-4 sm:p-6 md:p-4 space-y-4 sm:space-y-6 max-w-3xl mx-auto">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FilePlus2 className="w-6 h-6 text-action-primary" />
            <h1 className="text-xl md:text-2xl font-bold text-text-primary">New Permission &amp; Leave Request</h1>
          </div>
          <p className="text-xs md:text-sm text-text-muted">
            Submit a request for outing, leave, or late entry. Once approved by your faculty or warden, an active gate pass is issued.
          </p>
        </div>

        <PassCreateFormV2 mode="student" />
      </div>
    </AuthGuard>
  );
}
