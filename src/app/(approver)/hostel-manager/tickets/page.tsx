"use client";
export const dynamic = "force-dynamic";

// src/app/(approver)/hostel-manager/tickets/page.tsx
// SCAFFOLD:TICKETS — thin wrapper around MyTicketsPanel.
// Regenerate with: node scripts/scaffold-tickets.mjs new hostel-manager --force

import { Suspense } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { MyTicketsPanel } from "@/components/shared/MyTicketsPanel";
import type { Role } from "@/lib/types";

const ALLOWED_ROLES: Role[] = ["hostel_manager","deputy_warden","caretaker","warden"] as Role[];

function Inner() {
  return (
    <GuardedPage allowedRoles={ALLOWED_ROLES}>
      <MyTicketsPanel
        title="My Tickets"
        subtitle="Permission requests you have raised"
        backHref="/hostel-manager"
        newTicketHref="/student/permissions/new"
        canCreate={true}
      />
      <DevContactStrip />
    </GuardedPage>
  );
}

export default function HostelManagerTicketsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Inner />
    </Suspense>
  );
}
