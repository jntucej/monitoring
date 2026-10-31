"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import { DoorOpen, ArrowDownLeft, ArrowUpRight } from "lucide-react";

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

  const gates = data?.data?.gates ?? [];

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Gate Activity</h1>
        <p className="text-xs text-[var(--text-muted)]">
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
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DoorOpen className="size-4 text-[var(--action-info)]" />
                    <span className="font-semibold text-[var(--text-primary)]">{g.name}</span>
                  </div>
                  <span className="font-medium text-[var(--text-secondary)]">
                    {g.onPost} guards
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
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
                    <span className="font-semibold tabular-nums text-[var(--action-primary)]">
                      {g.onPost}
                    </span>
                  ),
                },
                {
                  header: "Recent Entries (1h)",
                  accessor: (g) => (
                    <span className="flex items-center gap-1">
                      <ArrowDownLeft className="size-3 text-[var(--action-info)]" />
                      {g.recentEntries}
                    </span>
                  ),
                },
                {
                  header: "Recent Exits (1h)",
                  accessor: (g) => (
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="size-3 text-[var(--action-warning)]" />
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
            />
          </div>
        </>
      )}
    </div>
  );
}
