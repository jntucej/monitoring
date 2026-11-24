"use client";

import { PageHeader } from "@/components/shared/PageHeader";
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

export default function HostelManagerResidentsPage() {
  const { inspection, inspect, closeInspection } = useEntityInspector();
  const { data, loading, error } = useApiResource<BlocksResponse>(
    "/api/hostel/blocks",
    { ttlMs: 30_000 },
  );
  const blocks = data?.data?.blocks ?? [];

  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Residents" subtitle="Students currently allocated to your blocks." />
      {error ? (
        <p className="text-xs text-text-muted">
          Block data unavailable: {error}
        </p>
      ) : loading && blocks.length === 0 ? (
        <p className="text-xs text-text-muted">Loading resident blocks…</p>
      ) : blocks.length === 0 ? (
        <p className="text-xs text-text-muted">No residents recorded in any hostel block yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-2.5">Block</th>
                <th className="px-4 py-2.5">Residents</th>
                <th className="px-4 py-2.5">Currently in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {blocks.map((b) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-text-muted">
        The full resident roster (per student, room, and contact) is available in the{" "}
        <a href="/admin/students" className="text-action-primary hover:underline">
          admin student roster
        </a>
        .
      </p>
      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </div>
  );
}
