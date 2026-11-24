"use client";

// src/app/(approver)/hostel-manager/page.tsx
// Resident ticket inbox for hostel staff: permission requests routed to this
// hostel block. The API scopes hostel_manager/caretaker/deputy_warden to
// their own hostel_scope (see /api/permissions GET branch), so residents\'
// tickets -- not the manager\'s own requests -- are the correct queue.

import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";

import { PermissionList } from "@/components/approver/PermissionList";
import { ApproverDecisionQueue } from "@/components/approver/ApproverDecisionQueue";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import type { Role } from "@/lib/types";

const ALLOWED_ROLES: Role[] = ["hostel_manager","deputy_warden","caretaker","warden"] as Role[];

function Inner() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <ContextSituationBar
        roleLabel="Hostel Manager"
        purpose="Review and process permission requests routed to your hostel block, and manage residential workflows"
        contextLabel="Resident Ticket Inbox"
        statusSummary="Process permission requests and leave applications routed to your assigned hostel blocks."
        severity="info"
        primaryAction={{ label: "Rooms & Occupancy", href: "/hostel-manager/rooms" }}
        secondaryActions={[
          { label: "Residents Roster", href: "/hostel-manager/residents" },
          { label: "Housekeeping", href: "/hostel-manager/housekeeping-tasks" },
          { label: "Maintenance", href: "/hostel-manager/maintenance" },
        ]}
      />
      <ApproverDecisionQueue
        roleLabel="Hostel Manager"
        forwardLabel="Forward to Deputy Warden"
        relatedHref="/hostel-manager/complaints"
        relatedLabel="Hostel Complaints"
      />
      <PermissionList
        title="Resident Tickets"
        description="Hostel permission requests routed to your block. Acting on a ticket advances it through the hostel approval chain."
        workflowType="hostel"
        allowForward
      />

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
