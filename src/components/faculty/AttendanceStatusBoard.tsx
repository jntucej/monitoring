"use client";

/**
 * AttendanceStatusBoard — 3-column status Kanban for a class's attendance:
 * Present / Absent / Unmarked.
 *
 * Data-driven (no local-only array cycles): reads the real
 * /api/faculty/attendance/roster payload (per-student present/absent/unmarked
 * counts + period) and moves a student by PATCHing
 * /api/faculty/attendance/roster/[studentId] ({ field, value, reason }),
 * then refetches so the board reflects the backend, not optimistic local state.
 *
 * The parent owns `useEntityInspector`; a row tap calls `onInspect(student)`.
 * Mutations are gated by a capability flag (`canMark`) — when false the
 * board is read-only (no buttons), so a client toggle alone can never
 * enable marking.
 */
import { useCallback, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { getAuthHeaders } from "@/lib/utils";
import { User, Check, X, HelpCircle, Loader2, RefreshCw } from "lucide-react";
import type { EntityInspection } from "@/components/shared/EntityInspector";

export interface RosterStudent {
  id: string;
  name: string;
  roll: string;
  present: number;
  absent: number;
  unmarked: number;
  pct: number;
}
export interface RosterSummary {
  total: number;
  present: number;
  absent: number;
  unmarked: number;
  pct: number;
  lastMonthPct: number | null;
}
export interface RosterPayload {
  classId: string;
  classLabel: string;
  period: string;
  summary: RosterSummary;
  students: RosterStudent[];
  /** Open disputes for the class (may be empty). */
  disputes?: Array<{ id: string; studentName: string; date: string; reason: string; status: string }>;
  /** Upcoming sessions for the class (real attendance_records, future dates). */
  upcoming?: Array<{ date: string; timeIn: string | null; timeOut: string | null }>;
}

interface Props {
  /** Real roster payload fetched by the parent (via useApiResource). */
  data: RosterPayload | null;
  loading?: boolean;
  error?: string | null;
  /** When true, rows expose real PATCH mutations; when false, read-only. */
  canMark?: boolean;
  /** Target class the roster belongs to — required for the per-student PATCH. */
  classId?: string;
  onInspect?: (s: RosterStudent) => void;
  /** Fired after a mutation succeeds so the parent can refresh its cache. */
  onMutated?: () => void;
  /** Fired on a mutation failure (e.g. the mark endpoint is unavailable) so the
   *  parent can surface a toast. Kept separate from onMutated (success). */
  onMutationError?: (msg: string) => void;
  title?: string;
}

type ColKey = "present" | "absent" | "unmarked";
const COLS: Array<{ key: ColKey; label: string; tone: string; icon: typeof Check }> = [
  { key: "present", label: "Present", tone: "text-action-success", icon: Check },
  { key: "absent", label: "Absent", tone: "text-action-danger", icon: X },
  { key: "unmarked", label: "Unmarked", tone: "text-text-muted", icon: HelpCircle },
];

/** A student is "in" a column when that status has at least one record and
 *  is their most-recent/only non-zero status. */
function columnFor(s: RosterStudent): ColKey {
  if (s.unmarked > 0 && s.present === 0 && s.absent === 0) return "unmarked";
  if (s.absent > 0 && s.absent >= s.present) return "absent";
  return "present";
}

export function AttendanceStatusBoard({
  data,
  loading,
  error,
  canMark = false,
  classId,
  onInspect,
  onMutated,
  onMutationError,
  title = "Attendance Status",
}: Props) {
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const markStudent = useCallback(
    async (studentId: string, field: "present" | "absent", reason: string) => {
      setActing(studentId);
      setBusy(true);
      try {
        const res = await fetch(`/api/faculty/attendance/roster/${encodeURIComponent(studentId)}`, {
          method: "PATCH",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ field, value: "1", reason, classId }),
        });
        if (res.ok) {
          onMutated?.();
        } else {
          onMutationError?.(`Could not mark attendance (${res.status}). The attendance-mark endpoint may be unavailable.`);
        }
      } catch {
        onMutationError?.("Could not reach the attendance-mark endpoint.");
      } finally {
        setBusy(false);
        setActing(null);
      }
    },
    [onMutated, onMutationError, classId],
  );

  const byCol: Record<ColKey, RosterStudent[]> = { present: [], absent: [], unmarked: [] };
  for (const s of data?.students ?? []) byCol[columnFor(s)].push(s);

  if (loading && !data) {
    return (
      <WidgetBoundary name="AttendanceStatusBoard" title={title}>
        <div className="p-4 flex items-center gap-2 text-sm text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Loading status board…
        </div>
      </WidgetBoundary>
    );
  }

  if (error && !data) {
    return (
      <WidgetBoundary name="AttendanceStatusBoard" title={title}>
        <div className="p-4 text-sm text-action-danger">{error}</div>
      </WidgetBoundary>
    );
  }

  if (!data || data.students.length === 0) {
    return (
      <WidgetBoundary name="AttendanceStatusBoard" title={title}>
        <div className="p-6 text-center text-sm text-text-muted">
          <HelpCircle className="w-5 h-5 mx-auto mb-2" />
          No attendance records for this class yet.
        </div>
      </WidgetBoundary>
    );
  }

  return (
    <WidgetBoundary name="AttendanceStatusBoard" title={title}>
      <div className="p-4 min-w-0">
        <div className="mb-3 flex items-center justify-between text-xs text-text-muted">
          <span>{data.classLabel} · {data.period}</span>
          <span className="font-mono">{data.summary.pct}% overall</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
          {COLS.map((col) => {
            const items = byCol[col.key];
            const Icon = col.icon;
            return (
              <div key={col.key} className="rounded-xl border border-border bg-bg-elevated/40 p-3 min-w-0">
                <div className={`mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider ${col.tone}`}>
                  <span className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" /> {col.label}
                  </span>
                  <span className="font-mono text-text-muted">{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-text-muted py-2">None</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((s) => (
                      <div
                        key={s.id}
                        role={onInspect ? "button" : undefined}
                        tabIndex={onInspect ? 0 : undefined}
                        onClick={() => onInspect?.(s)}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || e.key === " ") && onInspect) {
                            e.preventDefault();
                            onInspect(s);
                          }
                        }}
                        className="surface-card bg-bg-surface rounded-lg p-2 text-xs min-w-0 flex items-center justify-between gap-2 transition-colors hover:bg-bg-elev-2"
                        aria-label={`${s.name} (${s.roll}) — ${col.label}`}
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          <User className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          <span className="truncate text-text-primary font-medium">{s.name}</span>
                        </span>
                        {canMark ? (
                          <span className="flex items-center gap-1 shrink-0">
                            {busy && acting === s.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none text-text-muted" />
                            ) : col.key === "present" ? (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); void markStudent(s.id, "absent", "moved to absent"); }}
                                className="px-1.5 py-0.5 rounded border border-border text-[10px] text-text-muted hover:text-action-danger"
                                aria-label={`Mark ${s.name} absent`}
                              >
                                Mark absent
                              </button>
                            ) : col.key === "absent" ? (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); void markStudent(s.id, "present", "marked present"); }}
                                className="px-1.5 py-0.5 rounded border border-border text-[10px] text-text-muted hover:text-action-success"
                                aria-label={`Mark ${s.name} present`}
                              >
                                Mark present
                              </button>
                            ) : null}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {canMark && (
          <button
            type="button"
            onClick={() => onMutated?.()}
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        )}
      </div>
    </WidgetBoundary>
  );
}

export type { EntityInspection };
