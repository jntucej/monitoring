"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useApiResource } from "@/hooks/useApiResource";
import { PageLoading } from "@/components/shared/LoadingStates";
import { EmptyState } from "@/components/shared/EmptyState";
import { RequestTimeline } from "@/components/shared/RequestTimeline";
import { ArrowLeft } from "lucide-react";
import { PermissionTicketCard } from "@/components/student/PermissionTicketCard";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { WorkflowChainTracker } from "@/components/shared/WorkflowChainTracker";
import type { PermissionItem } from "@/components/approver/PermissionRow";

interface Payload {
  data: PermissionItem;
}

// Pass lifecycle: one ticket, full timeline.
export default function PassLifecyclePage() {
  const params = useParams<{ ticket: string }>();
  const ticket = decodeURIComponent(params.ticket);
  const { data, loading } = useApiResource<Payload>(
    `/api/permissions/${encodeURIComponent(ticket)}`,
    { ttlMs: 20_000 },
  );

  if (loading) return <PageLoading />;
  if (!data?.data)
    return (
      <EmptyState
        title="Pass not found"
        description="It may have been removed."
      />
    );

  const pass = data.data;
  const isApproved = pass.status?.toUpperCase() === "APPROVED";
  const isPending = pass.status?.toUpperCase() === "PENDING";

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <Link
        href="/student/passes"
        className="inline-flex items-center gap-1 text-sm text-action-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to passes
      </Link>
      <ContextSituationBar
        roleLabel="Student"
        purpose="Inspect end-to-end approval chain, reviewer timestamps, and QR activation status for this pass"
        contextLabel={`Pass #${ticket}`}
        severity={isApproved ? "ok" : isPending ? "warn" : "info"}
        statusPill={pass.status ?? "Status Unknown"}
        statusSummary={
          isApproved
            ? "Pass approved. Your QR code is active for gate scanner verification."
            : isPending
              ? "Pass awaiting approver signature from your assigned faculty or hostel warden."
              : `Current pass status is ${pass.status ?? "unknown"}.`
        }
        primaryAction={{ label: "All Gate Passes", href: "/student/passes" }}
        secondaryActions={[{ label: "New Request", href: "/student/permissions/new" }]}
      />
      <div className="surface-card bg-bg-surface p-3">
        <WorkflowChainTracker
          currentStage={pass.current_stage}
          ticketStatus={pass.status}
        />
      </div>
      <PermissionTicketCard ticket={pass} />
      <RequestTimeline ticket={ticket} />
    </div>
  );
}
