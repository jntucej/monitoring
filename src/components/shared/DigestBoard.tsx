"use client";

/**
 * DigestBoard — renders a digest-shaped endpoint as a compact card.
 *
 * The `kind: "digest"` board source points at endpoints whose `data` is a
 * named-key object (e.g. /api/principal/dashboard → { pendingApprovals,
 * recentAlerts, campusOccupancy }), not a flat array. The feed <Board>
 * renderer would show an empty list for those, so this component renders
 * each top-level key as a small stat tile instead.
 *
 * Rendering rules:
 *   - top-level key is a number  → stat tile showing the number
 *   - top-level key is an array  → "N items" stat tile
 *   - top-level key is an object → nested tiles / collapsed preview
 *   - top-level key is a string  → labeled value tile
 *   - empty / null data          → EmptyState
 *
 * Mobile: full-width, no horizontal scroll. Desktop: card grid.
 */

import { useMemo } from "react";
import { LayoutGrid, Loader2 } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

interface DigestResponse {
  success?: boolean;
  data: Record<string, unknown> | null;
}

export interface DigestBoardProps {
  source: string;
}

function TileValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    return <span className="text-lg font-bold">{value.length} items</span>;
  }
  if (typeof value === "number") {
    return <span className="text-lg font-bold tabular-nums">{value}</span>;
  }
  if (typeof value === "object" && value !== null) {
    // Nested object: show key count as a compact preview
    const keys = Object.keys(value);
    return (
      <span className="text-xs text-[var(--text-secondary)]">
        {keys.length} fields
      </span>
    );
  }
  if (typeof value === "string") {
    return <span className="text-sm font-semibold">{value}</span>;
  }
  return <span className="text-sm text-[var(--text-muted)]">—</span>;
}

export function DigestBoard({ source }: DigestBoardProps) {
  const { data, loading, error } = useApiResource<DigestResponse>(source, {
    ttlMs: 15_000,
  });

  const tiles = useMemo(() => {
    if (!data?.data) return [];
    return Object.entries(data.data).map(([key, value]) => ({ key, value }));
  }, [data]);

  return (
    <WidgetBoundary title="Digest">
      {loading && tiles.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading…</span>
        </div>
      ) : error ? (
        <div className="py-6 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg p-3">
          {error}
        </div>
      ) : tiles.length === 0 ? (
        <EmptyState
          title="No data"
          description="Nothing to show yet."
          icon={<LayoutGrid className="w-6 h-6" />}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-1">
          {tiles.map(({ key, value }) => (
            <div
              key={key}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 min-w-0"
            >
              <p className="text-[10px] font-mono uppercase tracking-wide text-[var(--text-muted)] truncate">
                {key}
              </p>
              <div className="mt-1">
                <TileValue value={value} />
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetBoundary>
  );
}
