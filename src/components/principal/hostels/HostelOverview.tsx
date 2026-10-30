"use client";

import { Building2, Users } from "lucide-react";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export interface HostelBlock {
  block: string;
  total: number;
  occupied: number;
}

export interface HostelOverviewData {
  blocks: HostelBlock[];
  summary: { total: number; occupied: number; available: number };
}

/**
 * HostelBlockCard — displays a single hostel block occupancy card.
 */
export function HostelBlockCard({ block }: { block: HostelBlock }) {
  const pct = block.total > 0 ? Math.round((block.occupied / block.total) * 100) : 0;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm">{block.block}</span>
        <span className="text-xs text-[var(--text-muted)]">
          {block.occupied}/{block.total}
        </span>
      </div>
      <div className="w-full h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * HostelBlockDrilldown — shows students in a specific block (optional).
 * Uses /api/hostel/blocks/[block]/students endpoint.
 */
export function HostelBlockDrilldown({ block }: { block: string }) {
  const [students, setStudents] = useState<{ roll: string; name: string }[] | null>(null);
  const [loading, setLoading] = useState(false);

  useAuthStore();
  usePolling(
    async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/hostel/blocks/${encodeURIComponent(block)}/students`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setStudents(json.data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    { intervalMs: 60_000 },
  );

  if (loading && !students) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (!students || students.length === 0) {
    return <p className="text-xs text-[var(--text-muted)] py-2">No students found for this block.</p>;
  }

  return (
    <ul className="space-y-1 mt-2">
      {students.slice(0, 20).map((s) => (
        <li key={s.roll} className="text-xs text-[var(--text-secondary)] flex justify-between">
          <span>{s.name}</span>
          <span className="font-mono text-[var(--text-muted)]">{s.roll}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * HostelOverview — occupancy summary + per-block cards.
 * Fetches /api/hostel/blocks.
 */
export function HostelOverview() {
  const [data, setData] = useState<HostelOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);

  usePolling(
    async () => {
      try {
        const res = await fetch("/api/hostel/blocks");
        const json = await res.json();
        if (json.success) {
          const blocks: HostelBlock[] = json.data?.blocks ?? [];
          const summary = {
            total: blocks.reduce((s, b) => s + b.total, 0),
            occupied: blocks.reduce((s, b) => s + b.occupied, 0),
            available: blocks.reduce((s, b) => s + b.total - b.occupied, 0),
          };
          setData({ blocks, summary });
        }
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    },
    { intervalMs: 60_000 },
  );

  return (
    <PrincipalWidgetBoundary title="Hostel Overview">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <Building2 className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">Hostel Occupancy</span>
        </div>

        {error && (
          <p className="text-xs text-rose-400 mb-2">{error}</p>
        )}

        {!data && !error && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--text-primary)]">{data.summary.total}</div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{data.summary.occupied}</div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase">Occupied</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-400">{data.summary.available}</div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase">Available</div>
              </div>
            </div>

            <div className="space-y-2">
              {data.blocks.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-2">No block data available.</p>
              ) : (
                data.blocks.map((b) => (
                  <div key={b.block}>
                    <HostelBlockCard block={b} />
                    {expandedBlock === b.block && <HostelBlockDrilldown block={b.block} />}
                    <button
                      type="button"
                      onClick={() => setExpandedBlock(expandedBlock === b.block ? null : b.block)}
                      className="text-[10px] text-indigo-400 hover:underline mt-1"
                    >
                      {expandedBlock === b.block ? "Hide" : "View students"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </PrincipalWidgetBoundary>
  );
}
