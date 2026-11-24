"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import {
  hostelBlockInspection,
  type HostelBlockOccupancy,
} from "@/components/approver/wardenConsoleModels";
import { useApiResource } from "@/hooks/useApiResource";

interface BlocksResponse {
  success: boolean;
  data: {
    blocks: Array<{ block: string; total: number; occupied: number }>;
  };
}

export default function HostelManagerRoomsPage() {
  const { inspection, inspect, closeInspection } = useEntityInspector();
  const { data, loading, error } = useApiResource<BlocksResponse>(
    "/api/hostel/blocks",
    { ttlMs: 30_000 },
  );
  const blocks = data?.data?.blocks ?? [];

  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Rooms" subtitle="Block and room occupancy." />
      <ContextSituationBar
        roleLabel="Hostel Manager"
        purpose="Monitor room capacity and block occupancy rates, and plan hostel space utilization"
        contextLabel={`Room Capacity & Occupancy · ${blocks.length} Blocks`}
        statusSummary={
          blocks.length > 0
            ? `${blocks.reduce((s, b) => s + b.occupied, 0)} occupied out of ${blocks.reduce((s, b) => s + b.total, 0)} beds allocated across ${blocks.length} blocks.`
            : "No hostel blocks recorded."
        }
        severity="info"
        primaryAction={{ label: "Bed Allocation", href: "/hostel-manager/allocation" }}
        secondaryActions={[
          { label: "View Residents", href: "/hostel-manager/residents" },
          { label: "Housekeeping", href: "/hostel-manager/housekeeping-tasks" },
        ]}
      />
      {error ? (
        <p className="text-xs text-text-muted">
          Block occupancy unavailable: {error}
        </p>
      ) : loading && blocks.length === 0 ? (
        <p className="text-xs text-text-muted">Loading block occupancy…</p>
      ) : blocks.length === 0 ? (
        <p className="text-xs text-text-muted">No hostel blocks recorded.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-2.5">Block</th>
                <th className="px-4 py-2.5">Allocated</th>
                <th className="px-4 py-2.5">Occupied</th>
                <th className="px-4 py-2.5">Occupancy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {blocks.map((b) => {
                const pct = b.total > 0 ? Math.round((b.occupied / b.total) * 100) : 0;
                return (
                  <tr
                    key={b.block}
                    className="cursor-pointer hover:bg-bg-elevated/30 transition-colors"
                    onClick={() =>
                      inspect(
                        hostelBlockInspection({
                          block: b.block,
                          total: b.total,
                          occupied: b.occupied,
                        } satisfies HostelBlockOccupancy),
                      )
                    }
                  >
                    <td className="px-4 py-2.5 text-text-secondary font-medium">
                      Block {b.block}
                    </td>
                    <td className="px-4 py-2.5 text-text-muted">{b.total}</td>
                    <td className="px-4 py-2.5 text-text-muted">{b.occupied}</td>
                    <td className="px-4 py-2.5 text-text-muted">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-text-muted">
        Room-level and resident-level detail is available in the{" "}
        <a href="/admin/students" className="text-action-primary hover:underline">
          admin student roster
        </a>
        .
      </p>
      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </div>
  );
}
