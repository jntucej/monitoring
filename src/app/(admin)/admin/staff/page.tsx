"use client";
import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from "react";
import {Search, X, Briefcase, Mail, ChevronRight, GraduationCap, Wrench}  from "lucide-react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { EntityInspector, KVPairs, InspectorButton } from "@/components/shared/EntityInspector";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MiniSparkline, MiniStackedBar,
} from "@/components/admin/kit";
import { getAuthHeaders } from "@/lib/utils";
import { usePolling } from "@/hooks/usePolling";
import { usePersistentQuery } from "@/hooks/usePersistentQuery";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

const StaffMonthlyReviewPanel = lazy(
  () => import("@/components/admin/StaffMonthlyReviewPanel")
);


/**
 * Admin Staff & Faculty — merged roster view.
 *
 * One page covering the staff / faculty / worker roles. KPI + role facets
 * come from the live `/api/staff/stats` (which reports byGroup/byDepartment
 * for the staff-scoped roles). The table rows come from `/api/staff/my-day`
 * (the staff tracking feed) when present, with a graceful fallback.
 */

type StaffRole = "staff" | "faculty" | "worker";

interface StaffRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: StaffRole;
  department: string | null;
  designation: string | null;
  status: string;
}

interface StaffStats {
  total: number;
  active: number;
  suspended: number;
  byGroup: Array<{
    group: string;
    count: number;
    color: string;
    roles: Array<{ role: string; count: number }>;
  }>;
  byDepartment: Array<{ code: string; name: string; count: number }>;
}

const ROLE_COLOR: Record<StaffRole, string> = {
  faculty: "var(--action-success)",
  staff: "var(--action-success)",
  worker: "var(--text-muted)",
};

const ROLE_ICON: Record<StaffRole, typeof Briefcase> = {
  faculty: GraduationCap,
  staff: Briefcase,
  worker: Wrench,
};

function normalizeRole(role: string | undefined | null): StaffRole | null {
  const r = (role ?? "").toLowerCase();
  if (r === "faculty" || r === "hod" || r === "principal" || r === "vice_principal")
    return "faculty";
  if (r === "staff" || r === "operator" || r === "caretaker" || r === "supervisor" || r === "worker")
    return r === "worker" ? "worker" : "staff";
  if (r === "worker") return "worker";
  return null;
}

async function fetchStats(): Promise<StaffStats | null> {
  const res = await fetch("/api/staff/stats", { headers: getAuthHeaders() });
  if (!res.ok) return null;
  const body = await res.json();
  return (body?.data ?? body) as StaffStats | null;
}

async function fetchRows(): Promise<StaffRow[]> {
  // Staff attendance feed provides the richest per-person records.
  try {
    const res = await fetch("/api/staff/my-day", { headers: getAuthHeaders() });
    if (res.ok) {
      const body = await res.json();
      const records = (body?.records ?? body?.data ?? []) as Array<Record<string, unknown>>;
      const rows: StaffRow[] = records
        .map((r) => {
          const role = normalizeRole(String(r.role ?? ""));
          if (!role) return null;
          return {
            id: String(r.id ?? r.user_id ?? ""),
            name: String(r.name ?? r.fullName ?? ""),
            email: (r.email as string) ?? null,
            phone: (r.phone as string) ?? null,
            role,
            department: (r.department as string) ?? (r.departmentId as string) ?? null,
            designation:
              (r.designation as string) ??
              ((r.employeeDetails as Record<string, unknown>)?.designation as string) ??
              null,
            status: String(r.status ?? "ACTIVE"),
          } as StaffRow;
        })
        .filter((r): r is StaffRow => r !== null && r.id.length > 0);
      if (rows.length) return rows;
    }
  } catch {
    /* fall through to the users endpoint */
  }

  // Fallback: the users roster filtered to staff-scoped roles.
  try {
    const res = await fetch("/api/users", { headers: getAuthHeaders() });
    if (!res.ok) return [];
    const body = await res.json();
    const arr = (body?.data ?? body ?? []) as Array<Record<string, unknown>>;
    return arr
      .map((r) => {
        const role = normalizeRole(String(r.role ?? ""));
        if (!role) return null;
        return {
          id: String(r.id ?? ""),
          name: String(r.name ?? r.fullName ?? ""),
          email: (r.email as string) ?? null,
          phone: (r.phone as string) ?? null,
          role,
          department: (r.department as string) ?? (r.departmentId as string) ?? null,
          designation: (r.designation as string) ?? null,
          status: String(r.status ?? "ACTIVE"),
        } as StaffRow;
      })
      .filter((r): r is StaffRow => r !== null);
  } catch {
    return [];
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function AdminStaffInner() {
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = usePersistentQuery("gate-admin-staff-query");
  const [roleFilter, setRoleFilter] = useState<StaffRole[]>([]);
  const [active, setActive] = useState<StaffRow | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        fetchStats().catch(() => null),
        fetchRows(),
      ]);
      setStats(s);
      setRows(r);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load staff");
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);
  usePolling(load, { intervalMs: 60_000 });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (roleFilter.length && !roleFilter.includes(r.role)) return false;
      if (
        q &&
        !`${r.name} ${r.email ?? ""} ${r.department ?? ""} ${r.designation ?? ""}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [rows, roleFilter, query]);

  const roleCounts = useMemo(() => {
    const c: Record<StaffRole, number> = { staff: 0, faculty: 0, worker: 0 };
    for (const r of rows) c[r.role] += 1;
    return c;
  }, [rows]);

  const toggleIn = (arr: StaffRole[], v: StaffRole, set: (n: StaffRole[]) => void) => {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  if (!stats && !rows.length && !error) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4 py-4 md:py-6">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Teaching, support, and worker roster with department breakdown"
        contextLabel="Teaching, support, and worker roster with department breakdown"
        statusSummary="Review current teaching, support, and worker roster with department breakdown state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
        <Skeleton className="h-6 w-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-6 rounded-2xl" />
      </div>
    );
  }

  const roleSegments = (Object.keys(roleCounts) as StaffRole[]).map((r) => ({
    value: roleCounts[r],
    color: ROLE_COLOR[r],
  }));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 py-4 md:py-6">
      <PageHeader
        title="Staff & Faculty"
        subtitle="Teaching, support, and worker roster with department breakdown"
        onRefresh={load}
      />

      {error && (
        <div className="surface-card p-3 text-sm text-action-danger">
          {error}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="surface-card p-4">
          <p className="text-xs text-text-muted">Total staff</p>
          <p className="text-2xl font-bold text-text-primary tabular-nums">
            {stats?.total ?? rows.length}
          </p>
          <MiniSparkline
            label=""
            values={[
              (stats?.active ?? 0) * 0.8,
              (stats?.active ?? 0) * 0.85,
              (stats?.active ?? 0) * 0.9,
              stats?.active ?? 0,
            ]}
            width={140}
            height={24}
          />
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-text-muted">Faculty</p>
          <p className="text-2xl font-bold text-action-success tabular-nums">
            {roleCounts.faculty}
          </p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-text-muted">Staff</p>
          <p className="text-2xl font-bold text-teal-400 tabular-nums">
            {roleCounts.staff}
          </p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-text-muted">Workers</p>
          <p className="text-2xl font-bold text-text-secondary tabular-nums">
            {roleCounts.worker}
          </p>
          <MiniStackedBar label="by role" segments={roleSegments} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 section-offscreen">
        {/* Facet rail */}
        <WidgetBoundary title="Filters">
          <aside className="surface-card p-4 space-y-4 lg:sticky lg:top-4 self-start">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                Role
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(roleCounts) as StaffRole[]).map((r) => {
                  const Icon = ROLE_ICON[r];
                  return (
                    <button
                      key={r}
                      onClick={() => toggleIn(roleFilter, r, setRoleFilter)}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition ${
                        roleFilter.includes(r)
                          ? "border-transparent text-white"
                          : "border-border text-text-primary"
                      }`}
                      style={roleFilter.includes(r) ? { background: ROLE_COLOR[r] } : undefined}
                    >
                      <Icon className="size-3.5" /> {r}{" "}
                      <span className="opacity-70">{roleCounts[r]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {(stats?.byDepartment?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                  By department
                </h3>
                <ul className="space-y-1 text-xs">
                  {stats?.byDepartment
                    .slice(0, 8)
                    .map((d) => (
                      <li key={d.code} className="flex items-center justify-between">
                        <span className="text-text-primary">{d.code}</span>
                        <span className="tabular-nums text-text-muted">{d.count}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {(roleFilter.length || query) && (
              <button
                onClick={() => {
                  setRoleFilter([]);
                  setQuery("");
                }}
                className="text-xs text-action-primary hover:underline flex items-center gap-1"
              >
                <X className="size-3.5" /> Clear filters
              </button>
            )}
          </aside>
        </WidgetBoundary>

        {/* Table */}
        <div className="lg:col-span-3 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, or department…"
              className="surface-card w-full min-h-11 pl-9 pr-3 py-2 bg-bg-surface/40 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-action-primary/40"
            />
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w160">
                <thead className="bg-bg-surface/60 text-text-muted text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium">Role</th>
                    <th className="text-left px-4 py-2.5 font-medium">Department</th>
                    <th className="text-left px-4 py-2.5 font-medium">Designation</th>
                    <th className="text-left px-4 py-2.5 font-medium">Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-text-muted">
                        No staff match this view
                      </td>
                    </tr>
                  )}
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setActive(r)}
                      className="border-t border-border hover:bg-bg-surface/40 cursor-pointer"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="size-6 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                            style={{ background: ROLE_COLOR[r.role] }}
                          >
                            {initials(r.name)}
                          </div>
                          <div className="min-w-4">
                            <p className="text-text-primary font-medium truncate">
                              {r.name}
                            </p>
                            <p className="text-xs text-text-muted truncate flex items-center gap-1">
                              <Mail className="size-3.5" /> {r.email ?? "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="surface-card text-xs uppercase tracking-wide px-2 py-0.5 font-medium"
                          style={{
                            background: `${ROLE_COLOR[r.role]}22`,
                            color: ROLE_COLOR[r.role],
                          }}
                        >
                          {r.role}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs">{r.department ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-text-muted">
                        {r.designation ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        <span
                          className={
                            r.status === "ACTIVE"
                              ? "text-action-primary"
                              : "text-action-warning"
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <ChevronRight className="w-4 h-4 text-text-muted" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer - standardized inspection model */}
      {(() => {
        const staffInspection = active
          ? {
              kind: "staff_member",
              title: active.name,
              subtitle: active.email,
              status: (
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    active.status === "ACTIVE"
                      ? "bg-emerald-500/15 text-action-success"
                      : "bg-rose-500/15 text-action-danger"
                  }`}
                >
                  {active.status}
                </span>
              ),
              sections: [
                {
                  title: "Overview",
                  content: (
                    <KVPairs
                      items={[
                        { label: "Role", value: active.role },
                        { label: "Department", value: active.department ?? "—" },
                        { label: "Designation", value: active.designation ?? "—" },
                        ...(active.phone ? [{ label: "Phone", value: active.phone }] : []),
                      ]}
                    />
                  ),
                },
                {
                  title: "Actions",
                  content: (
                    <div className="flex flex-wrap gap-2">
                      <InspectorButton
                        href={`/admin/staff/${active.id}`}
                        variant="primary"
                      >
                        <ChevronRight className="size-3.5" /> Full record
                      </InspectorButton>
                    </div>
                  ),
                },
              ],
              detailHref: `/admin/staff/${active.id}`,
              detailLabel: "Full record",
            }
          : null;
        return (
          <EntityInspector inspection={staffInspection} onClose={() => setActive(null)} />
        );
      })()}

      {/* Monthly review panel */}
      <Suspense fallback={null}>
        <StaffMonthlyReviewPanel />
      </Suspense>
    </div>
  );
}

export default function AdminStaffPage() {
  return (
    
      <AdminStaffInner />
    
    

  );
}
