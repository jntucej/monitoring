"use client";

/**
 * Board — vertical feed of records for the role console.
 *
 * Fetches the board source endpoint (e.g. /api/operator/transactions),
 * extracts the record array via the itemKey, and renders rows newest-first.
 * Each row is keyboard-focusable and clickable; keyboard up/down moves the
 * selection, Enter opens the ContextPanel via the onSelect callback.
 *
 * No horizontal scroll, no KPI cards, no charts — just the feed.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Loader2, Flag } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

export interface BoardRow {
  id: string;
  roll: string | null;
  name: string | null;
  person_type: string | null;
  direction: string;
  reason: string | null;
  gate_id: string | null;
  gate_name: string | null;
  timestamp: string;
  scan_type: string | null;
  is_correction: boolean | null;
  created_at: string | null;
}

interface BoardResponse {
  success?: boolean;
  data: {
    [itemKey: string]: BoardRow[] | { total: number; entries: number; exits: number; manual: number; flagged: number };
    counts: {
      total: number;
      entries: number;
      exits: number;
      manual: number;
      flagged: number;
    };
  };
}

export interface BoardProps {
  source: string;
  itemKey: string;
  /** Called when the user selects a row (keyboard Enter or click). */
  onSelect: (row: BoardRow) => void;
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
}

export function Board({ source, itemKey, onSelect }: BoardProps) {
  const { data, loading, error } = useApiResource<BoardResponse>(source, { ttlMs: 15_000 });

  const rows = useMemo(() => {
    const raw = data?.data?.[itemKey];
    const list = Array.isArray(raw) ? raw : [];
    return [...list].sort(
      (a, b) =>
        new Date(b.timestamp ?? b.created_at ?? 0).getTime() -
        new Date(a.timestamp ?? a.created_at ?? 0).getTime(),
    );
  }, [data, itemKey]);

  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);

  // Keep activeIndex in bounds when the list shrinks.
  useEffect(() => {
    if (activeIndex >= rows.length && rows.length > 0) setActiveIndex(rows.length - 1);
    if (rows.length === 0) setActiveIndex(0);
  }, [rows.length, activeIndex]);

  // Scroll the active row into view.
  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, rows.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (rows[activeIndex]) onSelect(rows[activeIndex]);
      }
    },
    [rows, activeIndex, onSelect],
  );

  return (
    <WidgetBoundary title="Feed">
      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading today&rsquo;s scans&hellip;
        </div>
      ) : error ? (
        <div className="py-6 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg p-3">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No scans recorded yet" description="Scans will appear here as they are processed at the gate." />
      ) : (
        <ol
          ref={listRef}
          className="space-y-1 max-h-[calc(100dvh-280px)] overflow-y-auto custom-scrollbar p-1"
          onKeyDown={handleKeyDown}
          tabIndex={0}
          aria-label="Today's scan feed"
          role="listbox"
        >
          {rows.map((row, idx) => {
            const isActive = idx === activeIndex;
            const isIn = row.direction === "IN";
            const isFlagged = row.is_correction === true || row.scan_type === "manual";
            return (
              <li key={row.id} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveIndex(idx);
                    onSelect(row);
                  }}
                  onFocus={() => setActiveIndex(idx)}
                  className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-left transition-colors min-h-[52px] ${
                    isActive
                      ? "bg-[var(--action-primary)]/10 border border-[var(--action-primary)]/30"
                      : "hover:bg-[var(--bg-elevated)] border border-transparent"
                  }`}
                >
                  {/* direction arrow */}
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isFlagged
                        ? "bg-amber-500/15 text-amber-400"
                        : isIn
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-rose-500/15 text-rose-400"
                    }`}
                  >
                    {isFlagged ? (
                      <Flag className="w-4 h-4" />
                    ) : isIn ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </span>

                  {/* name + roll */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                      {row.name || row.roll || "—"}
                    </p>
                    <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                      {row.roll || "—"}
                      {row.person_type ? ` · ${row.person_type}` : ""}
                    </p>
                  </div>

                  {/* gate + reason */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-[var(--text-secondary)] max-w-[80px] truncate">
                      {row.gate_name || row.gate_id || "Gate"}
                    </span>
                    {row.reason ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] max-w-[70px] truncate">
                        {row.reason}
                      </span>
                    ) : null}
                  </div>

                  {/* timestamp */}
                  <time className="text-[10px] font-mono text-[var(--text-muted)] tabular-nums shrink-0 w-[72px] text-right">
                    {fmtTime(row.timestamp ?? row.created_at)}
                  </time>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </WidgetBoundary>
  );
}
