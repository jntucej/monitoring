"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { useRoleContext } from "@/hooks/useRoleContext";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { buildHostelInspection } from "@/lib/principal/registerInspections";
import {
  buildHostelInspection as buildMainHostelInspection,
  type HostelRecord,
  type RoleGate,
} from "./entityInspectionModels";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import { RoleExportButton } from "@/components/shared/RoleExportButton";

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
  const {
    inspection: ourInspection,
    inspect: ourInspect,
    closeInspection,
  } = useEntityInspector();

  const role = useRoleContext();
  const gate: RoleGate = {
    isPrincipal: role.isPrincipal,
    isFaculty: role.isFaculty,
    role: role.role ?? null,
  };
  const [mainInspection, setMainInspection] = useState<
    ReturnType<typeof buildMainHostelInspection> | null
  >(null);
  const inspectMain = (block: HostelBlock) => {
    const name = block.name ?? block.block_name ?? "block";
    setMainInspection(
      buildMainHostelInspection(
        {
          block: name,
          total: block.capacity ?? block.total_rooms ?? 0,
          occupied: block.occupied ?? 0,
        } as HostelRecord,
        gate
      )
    );
  };

  const blocks = Array.isArray(data?.data) ? data.data : [];
  const totalCapacity = blocks.reduce((sum, b) => sum + (b.capacity ?? b.total_rooms ?? 0), 0);
  const totalOccupied = blocks.reduce((sum, b) => sum + (b.occupied ?? 0), 0);
  const openInspector = (b: HostelBlock) => inspectMain(b);

  return (
    <div className="space-y-4">
      <WeekBar />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Hostel Oversight</h1>
          <p className="text-xs text-text-muted">
            Hostel block status and occupancy · click any block to inspect
          </p>
        </div>
        <RoleExportButton
          resource="hostel-movement"
          filenamePrefix="principal-hostel-blocks"
          rows={blocks}
          columns={[
            { key: "name", header: "Block", accessor: (r) => r.name ?? r.block_name ?? "" },
            { key: "capacity", header: "Capacity", accessor: (r) => r.capacity ?? r.total_rooms ?? 0 },
            { key: "occupied", header: "Occupied", accessor: (r) => r.occupied ?? 0 },
            { key: "status", header: "Status", accessor: (r) => r.status ?? "ACTIVE" },
          ]}
        />
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Blocks"
          value={blocks.length}
          onClick={blocks.length > 0 ? () => openInspector(blocks[0]) : undefined}
        />
        <KpiCard label="Capacity" value={totalCapacity} onClick={blocks.length > 0 ? () => openInspector(blocks[0]) : undefined} />
        <KpiCard label="Occupied" value={totalOccupied} onClick={blocks.length > 0 ? () => openInspector(blocks[0]) : undefined} />
        <KpiCard
          label="Occupancy Rate"
          value={totalCapacity > 0 ? `${Math.round((totalOccupied / totalCapacity) * 100)}%` : "—"}
          tone="ok"
          drilldown={{ label: "Attendance", href: "/principal/people/attendance" }}
        />
      </div>

      {loading && blocks.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : blocks.length === 0 ? (
        <EmptyState title="No hostel blocks" description="Hostel information is currently unavailable." />
      ) : (
        <div className="space-y-5">
          {/* BAND 2: Hostel Block Action Cards */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Hostel Blocks ({blocks.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {blocks.map((b, idx) => {
                const name = b.name ?? b.block_name ?? `Block ${idx + 1}`;
                const cap = b.capacity ?? b.total_rooms ?? 0;
                const occ = b.occupied ?? 0;
                const pct = cap > 0 ? Math.min(100, Math.round((occ / cap) * 100)) : 0;
                return (
                  <button
                    key={b.id ?? idx}
                    type="button"
                    onClick={() => openInspector(b)}
                    className="surface-card bg-bg-surface p-4 text-left hover:bg-bg-elevated/40 transition-colors flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{name}</p>
                        <p className="text-xs text-text-muted">
                          {occ} / {cap || "—"} occupied ({pct}%)
                        </p>
                      </div>
                      <span className="surface-card bg-action-primary/10 px-2 py-0.5 text-xs text-action-primary">
                        {b.status ?? "ACTIVE"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-bg-elevated overflow-hidden">
                      <div className="h-full bg-action-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-text-muted pt-1 border-t border-border">
                      <span>Capacity: {cap || "—"}</span>
                      <span className="font-semibold text-action-primary">Inspect &rarr;</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* BAND 3: Collapsible Hostel Ledger */}
          <details className="surface-card bg-bg-surface/60 p-3">
            <summary className="cursor-pointer list-none flex items-center justify-between text-xs font-semibold text-text-secondary">
              <span>Full Hostel Block Ledger ({blocks.length})</span>
              <ChevronDown className="size-4 text-text-muted" />
            </summary>
            <div className="mt-3">
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
          </details>
        </div>
      )}

      <EntityInspectorPanel inspection={ourInspection} onClose={closeInspection} />
      <EntityInspector inspection={mainInspection} onClose={() => setMainInspection(null)} />
    </div>
  );
}
