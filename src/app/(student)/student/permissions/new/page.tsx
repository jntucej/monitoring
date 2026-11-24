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
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

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

        <ContextSituationBar
          roleLabel="Student"
          purpose="Create and dispatch new outing, day pass, home leave, or late-entry approval requests"
          contextLabel="New Pass Application"
          statusSummary="Fill in destination, departure/return times, and reason. Requests route to your mentor or hostel warden."
          primaryAction={{ label: "My Requests", href: "/student/permissions" }}
          secondaryAction={{ label: "Active Gate Passes", href: "/student/passes" }}
        />

        <PassCreateFormV2 mode="student" />
      </div>
    </AuthGuard>
  );
}
