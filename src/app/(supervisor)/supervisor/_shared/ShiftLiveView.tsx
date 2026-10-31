"use client";

import { ShiftBar } from "../_retention/ShiftBar";
import { HandoverStreak } from "../_retention/HandoverStreak";
import { useApiResource } from "@/hooks/useApiResource";
import { GateWall, type Gate } from "../_retention/GateWall";

export function ShiftLiveView() {
  const { data } = useApiResource<{
    data: {
      shift: { startedAt: string | null; endsAt: string | null };
      counts: { escalationsOpen: number; incidentsOpen: number };
      gates: Gate[];
    };
  }>("/api/supervisor/dashboard");

  const d = data?.data;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Live Shift</h1>
        <p className="text-xs text-[var(--text-muted)]">Active shift progress, gate health, and unresolved items</p>
      </header>
      <ShiftBar
        startedAt={d?.shift?.startedAt ?? null}
        endsAt={d?.shift?.endsAt ?? null}
        escalationsOpen={d?.counts?.escalationsOpen ?? 0}
        incidentsOpen={d?.counts?.incidentsOpen ?? 0}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HandoverStreak />
        <GateWall gates={d?.gates ?? []} />
      </div>
    </div>
  );
}
