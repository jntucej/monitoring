"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { buildHostelInspection } from "@/lib/principal/registerInspections";

interface HostelBlock {
  id?: string;
  name?: string;
  block_name?: string;
  total_rooms?: number;
  capacity?: number;
  occupied?: number;
  status?: string;
}

interface HostelBlocksResponse {
  success?: boolean;
  data: HostelBlock[];
}

export function HostelView() {
  const { data, loading } = useApiResource<HostelBlocksResponse>("/api/hostel/blocks", {
    ttlMs: 30_000,
  });
  const { inspection, inspect, closeInspection } = useEntityInspector();

  const blocks = Array.isArray(data?.data) ? data.data : [];
  const totalCapacity = blocks.reduce((sum, b) => sum + (b.capacity ?? b.total_rooms ?? 0), 0);
  const totalOccupied = blocks.reduce((sum, b) => sum + (b.occupied ?? 0), 0);
  const openInspector = (b: HostelBlock) => inspect(buildHostelInspection(b));

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-text-primary">Hostel Oversight</h1>
        <p className="text-xs text-text-muted">
          Hostel block status and occupancy
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Blocks" value={blocks.length} />
        <KpiCard label="Capacity" value={totalCapacity} />
        <KpiCard label="Occupied" value={totalOccupied} />
        <KpiCard
          label="Occupancy Rate"
          value={totalCapacity > 0 ? `${Math.round((totalOccupied / totalCapacity) * 100)}%` : "—"}
          tone="ok"
        />
      </div>

      {loading && blocks.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : blocks.length === 0 ? (
        <EmptyState title="No hostel blocks" description="Hostel information is currently unavailable." />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {blocks.map((b, idx) => {
              const name = b.name ?? b.block_name ?? `Block ${idx + 1}`;
              return (
                <li key={b.id ?? idx}>
                  <button
                    type="button"
                    onClick={() => openInspector(b)}
                    aria-label={`Inspect hostel block: ${name}`}
                    className="surface-card block w-full bg-bg-surface p-3 text-left"
                  >
                    <p className="text-sm font-medium">{name}</p>
                    <div className="mt-2 flex gap-3 text-xs text-text-secondary">
                      <span>Capacity: {b.capacity ?? b.total_rooms ?? "—"}</span>
                      <span>Occupied: {b.occupied ?? "—"}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="hidden md:block">
            <DataTable<HostelBlock>
              onRowClick={openInspector}
              columns={[
                {
                  header: "Block",
                  accessor: (r) => r.name ?? r.block_name ?? "Block",
                },
                {
                  header: "Capacity",
                  accessor: (r) => r.capacity ?? r.total_rooms ?? "—",
                },
                {
                  header: "Occupied",
                  accessor: (r) => r.occupied ?? "—",
                },
                {
                  header: "Status",
                  accessor: (r) => (
                    <span className="surface-card bg-action-primary/10 px-2 py-0.5 text-xs text-action-primary">
                      {r.status ?? "ACTIVE"}
                    </span>
                  ),
                },
              ]}
              data={blocks}
              keyExtractor={(r) => r.id ?? r.name ?? "block"}
            />
          </div>
        </>
      )}

      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </div>
  );
}
