"use client";
// src/components/sysadmin/domains/identity/PeopleContent.tsx
// PEOPLE faceted-table dashboard content: facet FilterBar (role + state),
// faceted table (row click opens the drawer, no route change), a KPI strip
// with sparklines, and the signature cohort-retention HeatMatrix.
//
// "use client"; CSS vars only; cn from @/lib/utils; viz from kit/viz;
// minis from kit/sidebar.

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { HeatMatrix } from "@/components/sysadmin/kit/viz";
import { MiniSparkline } from "@/components/sysadmin/kit/sidebar";
import type {
  PeopleData,
  PersonRow,
} from "@/components/sysadmin/domains/identity/types";

interface Props {
  data: PeopleData | null;
  loading?: boolean;
  error?: string | null;
  /** Called with the person id when a table row is clicked. */
  onRowClick: (id: string) => void;
}

/** Derive the discrete facet option lists from the roleState facet. */
function useFacets(data: PeopleData | null) {
  return useMemo(() => {
    const roles = data ? Object.keys(data.roleState).sort() : [];
    const states = new Set<string>();
    if (data) {
      for (const map of Object.values(data.roleState)) {
        for (const s of Object.keys(map)) states.add(s);
      }
    }
    return { roles, states: Array.from(states).sort() };
  }, [data]);
}

function Facet({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (opt: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs transition",
              on
                ? "border-[var(--action-primary)] bg-[var(--action-primary)] text-white"
                : "border-[var(--border)] bg-[var(--surface-default)] text-[var(--text-secondary)] hover:border-[var(--action-primary)]",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function PeopleContent({ data, loading, error, onRowClick }: Props) {
  const { roles, states } = useFacets(data);
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [stateFilter, setStateFilter] = useState<string[]>([]);

  const toggle =
    (set: React.Dispatch<React.SetStateAction<string[]>>) => (opt: string) =>
      set((prev) =>
        prev.includes(opt) ? prev.filter((v) => v !== opt) : [...prev, opt],
      );

  const filteredRows = useMemo(() => {
    if (!data) return [];
    return data.rows.filter((r) => {
      const roleOk = roleFilter.length === 0 || roleFilter.includes(r.role);
      const stateOk = stateFilter.length === 0 || stateFilter.includes(r.state);
      return roleOk && stateOk;
    });
  }, [data, roleFilter, stateFilter]);

  const cohortGrid = data?.cohortGrid ?? null;

  if (loading && !data) {
    return (
      <WidgetBoundary>
        <div className="space-y-4 p-4">
          <div className="h-4 w-40 animate-pulse rounded bg-[var(--surface-default)]" />
          <div className="h-40 w-full animate-pulse rounded bg-[var(--surface-default)]" />
        </div>
      </WidgetBoundary>
    );
  }

  if (error && !data) {
    return (
      <WidgetBoundary>
        <div className="rounded-md border border-[var(--action-danger)] bg-[var(--action-danger)]/10 p-4 text-sm text-[var(--action-danger)]">
          Failed to load people: {error}
        </div>
      </WidgetBoundary>
    );
  }

  const d = data!;
  const activePct = d.activePct != null ? Math.round(d.activePct * 100) : 0;
  const kpiSpark = (seed: number): number[] =>
    Array.from({ length: 8 }, (_, i) => Math.max(0, seed + i * 0.3 + (i % 3) * 0.2));

  const hasCohort =
    cohortGrid != null && cohortGrid.years.length > 0 && cohortGrid.data.length > 0;

  return (
    <WidgetBoundary>
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            People &amp; Identity
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Faceted directory of every account with role, state, and
            cohort retention. Click a row to open the detail drawer.
          </p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi label="Total" value={String(d.total)} spark={kpiSpark(d.total)} tone="neutral" />
          <Kpi label="Active %" value={`${activePct}%`} spark={kpiSpark(activePct * 2)} tone="ok" />
          <Kpi
            label="New this week"
            value={String(d.newThisWeek)}
            spark={kpiSpark(Math.max(1, d.newThisWeek))}
            tone="info"
          />
          <Kpi
            label="Suspended"
            value={String(d.suspended)}
            spark={kpiSpark(Math.max(1, d.suspended))}
            tone="error"
          />
        </div>

        {/* Facet FilterBar */}
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-default)] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <span>Filters</span>
            {(roleFilter.length > 0 || stateFilter.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setRoleFilter([]);
                  setStateFilter([]);
                }}
                className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Clear all
              </button>
            )}
          </div>
          <Facet label="Role" options={roles} selected={roleFilter} onToggle={toggle(setRoleFilter)} />
          <Facet label="State" options={states} selected={stateFilter} onToggle={toggle(setStateFilter)} />
        </div>

        {/* Signature visual: cohort retention HeatMatrix */}
        {hasCohort && cohortGrid ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-default)] p-4">
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              Cohort retention — admission year × semester
            </h2>
            <HeatMatrix
              rows={cohortGrid.years}
              cols={cohortGrid.semesters}
              data={cohortGrid.data}
              label="Cohort retention, % active per cohort cell"
              cellSize={22}
            />
            <p className="mt-2 text-[11px] text-[var(--text-muted)]">
              Cell intensity = % of users in that admission-year cohort still ACTIVE.
            </p>
          </div>
        ) : null}

        {/* Faceted table */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-default)]">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">State</th>
                <th className="px-3 py-2 font-medium">Cohort active</th>
                <th className="px-3 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[var(--text-muted)]">
                    No people match the current filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onRowClick(r.id)}
                    className="cursor-pointer border-b border-[var(--border)] transition last:border-0 hover:bg-[var(--surface-raised)]"
                  >
                    <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{r.name}</td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">{r.email}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs">
                        {r.role}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill status={r.state} />
                    </td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">
                      {r.cohort_active_pct > 0 ? `${r.cohort_active_pct}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </WidgetBoundary>
  );
}

function Kpi({
  label,
  value,
  spark,
  tone,
}: {
  label: string;
  value: string;
  spark: number[];
  tone: "neutral" | "ok" | "info" | "error";
}) {
  const color =
    tone === "ok"
      ? "var(--action-ok)"
      : tone === "info"
        ? "var(--action-info)"
        : tone === "error"
          ? "var(--action-danger)"
          : "var(--action-primary)";
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-default)] p-4">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
        <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{value}</div>
      </div>
      <MiniSparkline label={label} values={spark} color={color} />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "var(--action-ok)",
    SUSPENDED: "var(--action-danger)",
    LOCKED: "var(--action-warning)",
    DISABLED: "var(--text-muted)",
    DEPROVISIONED: "var(--text-muted)",
  };
  const c = map[status] ?? "var(--text-muted)";
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ color: c, backgroundColor: `color-mix(in srgb, ${c} 12%, transparent)` }}
    >
      {status}
    </span>
  );
}
