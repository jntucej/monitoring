"use client";
import { Suspense } from "react";


import React from "react";
import { useParams, useRouter } from "next/navigation";
import { PermissionDetailPanel } from "@/components/approver/PermissionDetailPanel";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";



function PermissionTicketInner() {
  const params = useParams();
  const router = useRouter();
  const ticket = typeof params?.ticket === "string" ? params.ticket : Array.isArray(params?.ticket) ? params.ticket[0] : "";

  if (!ticket) {
    return (
      <div className="p-6 text-center text-muted">
        No ticket specified.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-4 max-w-5xl mx-auto space-y-4 sm:space-y-6 min-w-0">
      <ContextSituationBar
        roleLabel="Approval Authority"
        purpose="Review individual ticket details, audit permission approval chains, and take resolution actions"
        why="Inspecting specific ticket records allows approvers to audit stage approvals, SLA deadlines, and student notes before acting."
        contextLabel={`Ticket Audit · ${ticket}`}
        statusTone="info"
        statusSummary={`Reviewing detailed approval pipeline and metadata for ticket ${ticket}.`}
        primaryAction={{ label: "Back to Queue", onClick: () => router.back() }}
      />
      <PermissionDetailPanel
        ticket={ticket}
        isStandalonePage
        onClose={() => router.back()}
      />
    </div>
  );
}
export default function PermissionTicketPage() {
  return (
    <AuthGuard allowedRoles={['admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <PermissionTicketInner />
      </Suspense>
    </AuthGuard>
  );
}
