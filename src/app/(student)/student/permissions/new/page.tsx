"use client";

import React from "react";
import { FilePlus2 } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PermissionRequestForm } from "@/components/student/PermissionRequestForm";

/**
 * New Permission Request page — student-facing form to create a hostel / exam /
 * memo permission request (Step 6). Wraps `PermissionRequestForm` behind a
 * student-only AuthGuard and routes to the ticket list after a submission.
 */
export default function NewPermissionPage() {
  return (
    <AuthGuard allowedRoles={["student"]}>
      <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
        {/* Page title — global DynamicHeader renders the app header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FilePlus2 className="w-6 h-6 text-[var(--action-primary)]" />
            <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">New Permission Request</h1>
          </div>
          <p className="text-xs md:text-sm text-[var(--text-muted)]">
            Raise a hostel, exam-document, or department-memo request and track its approval.
          </p>
        </div>

        <PermissionRequestForm />
      </div>
    </AuthGuard>
  );
}

