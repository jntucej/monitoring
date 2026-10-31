"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";

interface AcademicsResponse {
  success?: boolean;
  data: {
    exceptions: {
      absent: Array<{
        id: string;
        name: string;
        role: string;
        designation: string | null;
        department: string | null;
      }>;
      late: Array<{
        id: string;
        name: string;
        role: string;
        designation: string | null;
        department: string | null;
        minutesLate: number;
      }>;
      flagged: Array<{
        id: string;
        name: string;
        department: string | null;
        reason: string;
      }>;
    };
  };
}

export function ExceptionsView() {
  const { data, loading } = useApiResource<AcademicsResponse>("/api/vp/academics", {
    ttlMs: 60_000,
  });

  const d = data?.data;
  const absent = d?.exceptions?.absent ?? [];
  const late = d?.exceptions?.late ?? [];
  const flagged = d?.exceptions?.flagged ?? [];
  const total = absent.length + late.length + flagged.length;

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Attendance exceptions</h1>
        <p className="text-xs text-[var(--text-muted)]">
          {total} exception{total === 1 ? "" : "s"} today
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Absent" value={absent.length} tone="danger" />
        <KpiCard label="Late" value={late.length} tone="warn" />
        <KpiCard label="Flagged" value={flagged.length} tone="info" />
      </div>

      {loading && !d ? (
        <ListSkeleton rows={5} />
      ) : total === 0 ? (
        <EmptyState title="No exceptions" description="Everyone checked in on time." />
      ) : (
        <div className="space-y-3">
          {absent.length > 0 && (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]">
              <header className="border-b border-[var(--border)] px-4 py-3">
                <h2 className="text-sm font-semibold">Absent today ({absent.length})</h2>
              </header>
              <ul className="divide-y divide-[var(--border)]">
                {absent.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-2 text-xs">
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-[var(--text-muted)]">
                      {p.designation ?? p.role}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {late.length > 0 && (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]">
              <header className="border-b border-[var(--border)] px-4 py-3">
                <h2 className="text-sm font-semibold">Late arrivals ({late.length})</h2>
              </header>
              <ul className="divide-y divide-[var(--border)]">
                {late.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-2 text-xs">
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-[var(--action-warning)]">{p.minutesLate}m late</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {flagged.length > 0 && (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]">
              <header className="border-b border-[var(--border)] px-4 py-3">
                <h2 className="text-sm font-semibold">Flagged ({flagged.length})</h2>
              </header>
              <ul className="divide-y divide-[var(--border)]">
                {flagged.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-2 text-xs">
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-[var(--action-danger)]">{p.reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
