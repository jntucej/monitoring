"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { GateWall, type Gate } from "../_retention/GateWall";
import { ShiftBar } from "../_retention/ShiftBar";
import { HandoverStreak } from "../_retention/HandoverStreak";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { shiftInspection, useRoleInspectorHost } from "@/components/shared/roleInspectors";
import { ChevronDown } from "lucide-react";

interface ShiftDashboardResponse {
  data: {
    shift: { startedAt: string | null; endsAt: string | null };
    counts: { escalationsOpen: number; incidentsOpen: number };
    gates: Gate[];
  };
}

/**
 * Live shift view. The shift bar is the shift *record* for this console:
 * clicking it opens the standardized shift inspector (overview → coverage
 * → handover → actions), role-gated to the real routes:
 * GET /api/supervisor/shift + POST /api/supervisor/shift (handover).
 */
export function ShiftLiveView() {
  const { data } = useApiResource<ShiftDashboardResponse>("/api/supervisor/dashboard");
  const { inspection, inspect, closeInspection, role } = useRoleInspectorHost();

  const d = data?.data;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-primary">Live Shift</h1>
        <p className="text-xs text-muted">Active shift progress, gate health, and unresolved items</p>
      </header>
      <button
        type="button"
        className="w-full text-left cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
        onClick={() => inspect(shiftInspection({
          shiftId: null,
          startedAt: d?.shift?.startedAt ?? null,
          endsAt: d?.shift?.endsAt ?? null,
          unresolvedIncidents: d?.counts?.incidentsOpen ?? 0,
        }, role))}
      >
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-text-muted">
          <ChevronDown className="size-3" /> tap to inspect the shift record
        </div>
        <ShiftBar
          startedAt={d?.shift?.startedAt ?? null}
          endsAt={d?.shift?.endsAt ?? null}
          escalationsOpen={d?.counts?.escalationsOpen ?? 0}
          incidentsOpen={d?.counts?.incidentsOpen ?? 0}
        />
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HandoverStreak />
        <GateWall gates={d?.gates ?? []} />
      </div>

      <EntityInspector inspection={inspection} onClose={closeInspection} />
    </div>
  );
}
