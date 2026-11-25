"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { GateWall, type Gate } from "../../_retention/GateWall";
import { useApiResource } from "@/hooks/useApiResource";
import { ListSkeleton } from "../../_shared/ListSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";

export default function GateWallPage() {
  const { data, loading } = useApiResource<{ data: { gates: Gate[] } }>(
    "/api/supervisor/dashboard",
    { ttlMs: 15_000 }
  );
  const gates = data?.data?.gates ?? [];

  return (
    <div className="space-y-4">
      <ContextSituationBar
        roleLabel="Gate Supervisor"
        purpose="Visual command wall providing instantaneous high-level status across all campus access portals"
        contextLabel="Gate Wall Matrix"
        statusSummary="Comprehensive multi-gate operational wall for perimeter security and incident response dispatch."
        why="Wall view presents side-by-side post readiness, scan rates, and barrier health to enable rapid incident dispatch."
        primaryAction={{ label: "Active Gates", href: "/supervisor/gates/live" }}
        secondaryAction={{ label: "Security Escalations", href: "/supervisor/response/escalations" }}
      />
      {loading && gates.length === 0 ? (
        <ListSkeleton rows={4} />
      ) : gates.length === 0 ? (
        <EmptyState title="No gates assigned" description="No supervised gates found." />
      ) : (
        <GateWall gates={gates} />
      )}
    </div>
  );
}
