"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { Moon } from "lucide-react";
import { ListSkeleton } from "./ListSkeleton";

export function TeamCurfewView() {
  const { data, loading } = useApiResource<{
    data: {
      workers: Array<{
        id: string;
        name: string;
        staffCategory: string;
        gateName: string | null;
        status: string;
      }>;
    };
  }>("/api/supervisor/team-roster");

  const workers = data?.data?.workers ?? [];
  const inside = workers.filter((w) => w.status === "INSIDE");

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Curfew Oversight</h1>
        <p className="text-xs text-[var(--text-muted)]">Worker and resident night presence verification</p>
      </header>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <div className="flex items-center gap-3">
          <Moon className="size-5 text-[var(--action-info)]" />
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Night Shift Coverage</h2>
            <p className="text-xs text-[var(--text-muted)]">
              {inside.length} worker{inside.length === 1 ? "" : "s"} currently accounted inside campus gates.
            </p>
          </div>
        </div>
      </div>

      {loading && workers.length === 0 ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]">
          <ul className="divide-y divide-[var(--border)]">
            {inside.map((w) => (
              <li key={w.id} className="flex items-center justify-between p-3 text-xs">
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">{w.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{w.staffCategory}</p>
                </div>
                <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                  {w.gateName ?? "Unassigned"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
