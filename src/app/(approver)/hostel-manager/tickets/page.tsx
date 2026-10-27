"use client";
export const dynamic = "force-dynamic";

// src/app/(approver)/hostel-manager/tickets/page.tsx
// Resident ticket inbox for hostel staff: permission requests routed to this
// hostel block. The API scopes hostel_manager/caretaker/deputy_warden to
// their own hostel_scope (see /api/permissions GET branch), so residents\'
// tickets -- not the manager\'s own requests -- are the correct queue.

import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PermissionList } from "@/components/approver/PermissionList";
import type { Role } from "@/lib/types";

const ALLOWED_ROLES: Role[] = ["hostel_manager","deputy_warden","caretaker","warden"] as Role[];

function Inner() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <PermissionList
        title="Resident Tickets"
        description="Hostel permission requests routed to your block. Acting on a ticket advances it through the hostel approval chain."
        workflowType="hostel"
        allowForward
      />
      <DevContactStrip />
    </div>
  );
}

export default function HostelManagerTicketsPage() {
  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <Suspense fallback={<PageLoading />}>
        <Inner />
      </Suspense>
    </AuthGuard>
  );
}
