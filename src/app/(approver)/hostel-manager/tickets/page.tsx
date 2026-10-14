"use client";
// src/app/(approver)/hostel-manager/tickets/page.tsx
// SCAFFOLD:TICKETS — thin wrapper around MyTicketsPanel.
// Regenerate with: node scripts/scaffold-tickets.mjs new hostel-manager --force

import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { MyTicketsPanel } from "@/components/shared/MyTicketsPanel";
import type { Role } from "@/lib/types";

const ALLOWED_ROLES: Role[] = ["hostel_manager","deputy_warden","caretaker","warden"] as Role[];

function Inner() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <MyTicketsPanel
        title="My Tickets"
        subtitle="Permission requests you have raised"
        backHref="/hostel-manager"
        newTicketHref="/student/permissions/new"
        canCreate={true}
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
