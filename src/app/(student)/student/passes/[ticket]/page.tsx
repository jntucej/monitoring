"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useApiResource } from "@/hooks/useApiResource";
import { PageLoading } from "@/components/shared/LoadingStates";
import { EmptyState } from "@/components/shared/EmptyState";
import { RequestTimeline } from "@/components/shared/RequestTimeline";
import { ArrowLeft } from "lucide-react";
import { PermissionTicketCard } from "@/components/student/PermissionTicketCard";
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
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <Link
        href="/student/passes"
        className="inline-flex items-center gap-1 text-sm textaction-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to passes
      </Link>
      <PermissionTicketCard ticket={pass} />
      <RequestTimeline ticket={ticket} />
    </div>
  );
}
