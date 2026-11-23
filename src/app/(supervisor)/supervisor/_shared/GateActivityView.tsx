"use client";

import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { gateLiveInspection, useRoleInspectorHost } from "@/components/shared/roleInspectors";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import { DoorOpen, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { CommandPivotDrawer, type CommandPivotTarget } from "@/components/nav/level3/CommandPivotDrawer";

interface GateLiveItem {
  id: string;
  gateCode: string;
  name: string;
  location: string | null;
  isActive: boolean;
  onPost: number;
  lastActivity: string | null;
  recentEntries: number;
  recentExits: number;
}

interface GateLiveResponse {
  data: {
    gates: GateLiveItem[];
  };
}

export function GateActivityView() {
  const { data, loading } = useApiResource<GateLiveResponse>(
    "/api/supervisor/gate-live",
    { ttlMs: 15_000 }
  );
  const { inspection, inspect, closeInspection, role } = useRoleInspectorHost();
  const [pivot, setPivot] = useState<CommandPivotTarget | null>(null);

  const gates = data?.data?.gates ?? [];
  const openGate = (g: GateLiveItem) => {
    inspect(gateLiveInspection(g, role));
    setPivot({
      kind: "gate",
      id: g.id,
      title: g.name,
      subtitle: `${g.gateCode} · ${g.location ?? ""} · ${g.onPost} guards · In: ${g.recentEntries} / Out: ${g.recentExits}`,
      fullRoute: `/admin/gates/${g.id}`,
      relatedLinks: [
        { label: "Gate Wall", href: "/supervisor/gates/wall" },
        { label: "Gate Activity", href: "/supervisor/gates/activity" },
        { label: "Incidents", href: "/supervisor/response/incidents" },
        { label: "Escalations", href: "/supervisor/response/escalations" },
        { label: "Team", href: "/supervisor/team" },
        { label: "Shifts", href: "/supervisor/shift" },
      ],
    });
  };

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-text-primary">Gate Activity</h1>
        <p className="text-xs text-text-muted">
          Live gate occupancy, guard coverage, and hourly movement volumes
        </p>
      </header>

      {loading && gates.length === 0 ? (
        <ListSkeleton rows={4} />
      ) : gates.length === 0 ? (
        <EmptyState title="No gates assigned" description="No supervised gates found." />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {gates.map((g) => (
              <li
                key={g.id}
                className="surface-card bg-bg-surface p-3 text-xs cursor-pointer hover:bg-bg-surface/60 transition-colors"
                onClick={() => openGate(g)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DoorOpen className="size-4 text-action-info" />
                    <span className="font-semibold text-text-primary">{g.name}</span>
                  </div>
                  <span className="font-medium text-text-secondary">
                    {g.onPost} guards
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
                  <span>In: {g.recentEntries} / 1h</span>
                  <span>Out: {g.recentExits} / 1h</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<GateLiveItem>
              columns={[
                { header: "Gate Code", accessor: (g) => g.gateCode },
                { header: "Gate Name", accessor: (g) => g.name },
                {
                  header: "Guards on Post",
                  accessor: (g) => (
                    <span className="font-semibold tabular-nums text-action-primary">
                      {g.onPost}
                    </span>
                  ),
                },
                {
                  header: "Recent Entries (1h)",
                  accessor: (g) => (
                    <span className="flex items-center gap-1">
                      <ArrowDownLeft className="size-3 text-action-info" />
                      {g.recentEntries}
                    </span>
                  ),
                },
                {
                  header: "Recent Exits (1h)",
                  accessor: (g) => (
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="size-3 text-action-warning" />
                      {g.recentExits}
                    </span>
                  ),
                },
                {
                  header: "Last Activity",
                  accessor: (g) =>
                    g.lastActivity
                      ? new Date(g.lastActivity).toLocaleTimeString()
                      : "—",
                },
              ]}
              data={gates}
              keyExtractor={(g) => g.id}
              onRowClick={(g) => openGate(g)}
            />
          </div>
        </>
      )}

      <EntityInspector inspection={inspection} onClose={() => { closeInspection(); setPivot(null); }} />
      <CommandPivotDrawer target={pivot} onClose={() => setPivot(null)} />
    </div>
  );
}
