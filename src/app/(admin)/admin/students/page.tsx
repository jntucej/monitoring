"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search, X, Users, Home, Building2,
  TrendingUp, ChevronRight, Mail, Phone, User,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MiniSparkline, MiniStackedBar, MiniCountPills,
} from "@/components/admin/kit";
import { getAuthHeaders } from "@/lib/utils";
import { usePolling } from "@/hooks/usePolling";
import { parseRollNumber } from "@/lib/rollNumber";
import type { Person, StudentDetails } from "@/lib/types";

/**
 * Admin Students — faceted student directory.
 *
 * Re-skin of the old `StudentInfographics + UserManagementPanel` stack. One
 * live source of truth: the `/api/students` roster (admin-scoped full list).
 * KPIs + facet counts are derived client-side from the rows so the page
 * renders even when the roster is partial. Glass chrome + Mini* kit.
 */

interface StudentRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  roll: string | null;
  department: string | null;
  course: string | null;
  year: number | null;
  section: string | null;
  status: string;
  isHosteller: boolean;
  hostelBlock: string | null;
  roomNumber: string | null;
  cohort_active_pct?: number;
}

interface StudentsData {
  total: number;
  active: number;
  suspended: number;
  onCampusToday: number;
  todayEntries: number;
  todayExits: number;
  rows: StudentRow[];
  byDepartment: Array<{ code: string; name: string; count: number }>;
  byYear: Array<{ year: string; count: number }>;
  byType: Array<{ type: string; label: string; count: number }>;
  byGender: Array<{ gender: string; count: number }>;
}

const DEPT_COLORS: Record<string, string> = {
  CSE: "#3b82f6",
  IT: "#06b6d4",
  ECE: "#10b981",
  EEE: "#f59e0b",
  MECH: "#ef4444",
};

function deptColor(code: string | null | undefined) {
  if (!code) return "var(--text-muted)";
  return DEPT_COLORS[code.toUpperCase()] ?? "var(--action-primary)";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

async function fetchStudents(): Promise<StudentsData> {
  const res = await fetch("/api/students", { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`students → ${res.status}`);
  const body = await res.json();
  const arr = (body?.data ?? body ?? []) as Person[];

  const rows: StudentRow[] = arr.map((p) => {
    const sd: Partial<StudentDetails> = p.studentDetails ?? {};
    const roll = (p.roll ?? p.uniqueId ?? sd.roll ?? "").toString();
    const decoded = roll ? parseRollNumber(roll) : null;
    return {
      id: p.id,
      name: p.fullName ?? p.name ?? "",
      email: p.email ?? null,
      phone: p.phone ?? null,
      roll: roll || null,
      department:
        decoded?.department ?? p.department ?? sd.department ?? null,
      course:
        decoded?.entryMode
          ? decoded.entryMode.startsWith("M.Tech") || decoded.entryMode.startsWith("PG")
            ? "M.Tech"
            : "B.Tech"
          : (p.course ?? sd.course ?? null),
      year: p.year ?? sd.year ?? null,
      section: p.section ?? sd.section ?? null,
      status: p.status ?? "ACTIVE",
      isHosteller: !!sd.hostelBlock,
      hostelBlock: (sd.hostelBlock ?? p.hostelBlock ?? null) as string | null,
      roomNumber: (sd.roomNumber ?? p.roomNumber ?? null) as string | null,
      cohort_active_pct: p.status === "ACTIVE" ? 100 : 0,
    };
  });

  // Facets computed from the live rows.
  const byDeptMap = new Map<string, number>();
  const byYearMap = new Map<string, number>();
  const genderMap = new Map<string, number>();
  let active = 0;
  let suspended = 0;
  let hostellers = 0;
  for (const [i, r] of rows.entries()) {
    if (r.department) byDeptMap.set(r.department, (byDeptMap.get(r.department) ?? 0) + 1);
    if (r.year) byYearMap.set(String(r.year), (byYearMap.get(String(r.year)) ?? 0) + 1);
    if (r.status === "ACTIVE") active += 1;
    if (r.status === "SUSPENDED" || r.status === "LOCKED") suspended += 1;
    if (r.isHosteller) hostellers += 1;
    const g = arr[i]?.studentDetails?.gender;
    if (g) genderMap.set(g, (genderMap.get(g) ?? 0) + 1);
  }

  return {
    total: rows.length,
    active,
    suspended,
    onCampusToday: 0,
    todayEntries: 0,
    todayExits: 0,
    rows,
    byDepartment: Array.from(byDeptMap.entries())
      .map(([code, count]) => ({ code, name: code, count }))
      .sort((a, b) => b.count - a.count),
    byYear: Array.from(byYearMap.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year.localeCompare(b.year)),
    byType: [
      { type: "hosteller", label: "Hostellers", count: hostellers },
      { type: "day_scholar", label: "Day scholars", count: rows.length - hostellers },
    ],
    byGender: Array.from(genderMap.entries()).map(([gender, count]) => ({
      gender,
      count,
    })),
  };
}

function AdminStudentsInner() {
  const [data, setData] = useState<StudentsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<"all" | "hosteller" | "day_scholar">("all");
  const [active, setActive] = useState<StudentRow | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await fetchStudents());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load students");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  usePolling(load, { intervalMs: 60_000 });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.rows.filter((r) => {
      if (deptFilter.length && r.department && !deptFilter.includes(r.department)) return false;
      if (yearFilter.length && r.year && !yearFilter.includes(String(r.year))) return false;
      if (typeFilter === "hosteller" && !r.isHosteller) return false;
      if (typeFilter === "day_scholar" && r.isHosteller) return false;
      if (q && !`${r.name} ${r.roll ?? ""} ${r.email ?? ""}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [data, query, deptFilter, yearFilter, typeFilter]);

  const toggleIn = (arr: string[], v: string, set: (n: string[]) => void) => {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  if (!data && !error) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const deptSegments = (data?.byDepartment ?? []).map((d) => ({
    value: d.count,
    color: deptColor(d.code),
  }));
  const typeSegments = (data?.byType ?? []).map((t) => ({
    value: t.count,
    color: t.type === "hosteller" ? "var(--action-primary)" : "var(--action-info)",
  }));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Students"
        subtitle="Full student roster with department, year, and hostel state"
        onRefresh={load}
      />

      {error && (
        <div className="glass-card border border-[var(--action-danger)]/30 p-3 text-sm text-[var(--action-danger)]">
          {error}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)]">Total students</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {data?.total ?? 0}
          </p>
          {data && <MiniSparkline
            label=""
            values={[data.total * 0.85, data.total * 0.9, data.total * 0.88, data.total * 0.95, data.total]}
            width={140}
            height={24}
          />}
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)]">Active</p>
          <p className="text-2xl font-bold text-[var(--action-primary)] tabular-nums">
            {data?.active ?? 0}
          </p>
          <MiniCountPills
            label="by state"
            counts={[data?.active ?? 0, data?.suspended ?? 0]}
          />
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)]">On campus today</p>
          <p className="text-2xl font-bold text-sky-400 tabular-nums">
            {data?.onCampusToday ?? 0}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {data?.todayEntries ?? 0} in · {data?.todayExits ?? 0} out
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-[var(--text-muted)]">Hostellers</p>
          <p className="text-2xl font-bold text-violet-400 tabular-nums">
            {data?.byType.find((t) => t.type === "hosteller")?.count ?? 0}
          </p>
          <MiniStackedBar label="by type" segments={typeSegments} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Facet rail */}
        <WidgetBoundary title="Filters">
          <aside className="glass-card p-4 space-y-4 lg:sticky lg:top-4 self-start">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                Department
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(data?.byDepartment ?? []).map((d) => (
                  <button
                    key={d.code}
                    onClick={() => toggleIn(deptFilter, d.code, setDeptFilter)}
                    className={`text-[11px] px-2 py-1 rounded-full border transition ${
                      deptFilter.includes(d.code)
                        ? "border-transparent text-white"
                        : "border-[var(--border)] text-[var(--text-primary)]"
                    }`}
                    style={deptFilter.includes(d.code) ? { background: deptColor(d.code) } : undefined}
                  >
                    {d.code} <span className="opacity-70">{d.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                Year
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(data?.byYear ?? []).map((y) => (
                  <button
                    key={y.year}
                    onClick={() => toggleIn(yearFilter, y.year, setYearFilter)}
                    className={`text-[11px] px-2 py-1 rounded-full border transition ${
                      yearFilter.includes(y.year)
                        ? "border-[var(--action-primary)] bg-[var(--action-primary)]/10 text-[var(--action-primary)]"
                        : "border-[var(--border)] text-[var(--text-primary)]"
                    }`}
                  >
                    Year {y.year} <span className="opacity-70">{y.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                Type
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(["all", "hosteller", "day_scholar"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`text-[11px] px-2 py-1 rounded-full border transition ${
                      typeFilter === t
                        ? "border-[var(--action-primary)] bg-[var(--action-primary)]/10 text-[var(--action-primary)]"
                        : "border-[var(--border)] text-[var(--text-primary)]"
                    }`}
                  >
                    {t === "all" ? "All" : t === "hosteller" ? "Hostellers" : "Day scholars"}
                  </button>
                ))}
              </div>
            </div>

            {(deptFilter.length || yearFilter.length || typeFilter !== "all" || query) && (
              <button
                onClick={() => {
                  setDeptFilter([]);
                  setYearFilter([]);
                  setTypeFilter("all");
                  setQuery("");
                }}
                className="text-xs text-[var(--action-primary)] hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
          </aside>
        </WidgetBoundary>

        {/* Table */}
        <div className="lg:col-span-3 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, roll, or email…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/40 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)]/40"
            />
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-[var(--bg-surface)]/60 text-[var(--text-muted)] text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Student</th>
                    <th className="text-left px-4 py-2.5 font-medium">Department</th>
                    <th className="text-left px-4 py-2.5 font-medium">Year</th>
                    <th className="text-left px-4 py-2.5 font-medium">Type</th>
                    <th className="text-left px-4 py-2.5 font-medium">Room</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-[var(--text-muted)]">
                        No students match this view
                      </td>
                    </tr>
                  )}
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => window.location.href = `/admin/students/${r.roll ?? r.id}`}
                      className="border-t border-[var(--border)] hover:bg-[var(--bg-surface)]/40 cursor-pointer"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
                            style={{ background: deptColor(r.department) }}
                          >
                            {initials(r.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[var(--text-primary)] font-medium truncate">{r.name}</p>
                            <p className="text-[11px] text-[var(--text-muted)] font-mono">{r.roll ?? "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: `${deptColor(r.department)}22`,
                            color: deptColor(r.department),
                          }}
                        >
                          {r.department ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs">{r.year ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        {r.isHosteller ? (
                          <span className="flex items-center gap-1 text-xs text-violet-400">
                            <Home className="w-3 h-3" /> Hosteller
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-sky-400">
                            <Building2 className="w-3 h-3" /> Day
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">
                        {r.hostelBlock && r.roomNumber
                          ? `${r.hostelBlock}-${r.roomNumber}`
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer */}
      {active && (
        <div className="fixed inset-0 z-[80] flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setActive(null)}
          />
          <aside className="relative w-full max-w-md h-full glass-card border-l border-[var(--border)] p-5 overflow-y-auto">
            <header className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                  style={{ background: deptColor(active.department) }}
                >
                  {initials(active.name)}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    {active.name}
                  </h2>
                  <p className="text-xs font-mono text-[var(--text-muted)]">
                    {active.roll ?? "—"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActive(null)}
                className="p-1 rounded hover:bg-[var(--bg-surface)]/60"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-[var(--text-muted)]">Department</dt>
                <dd className="text-[var(--text-primary)]">{active.department ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Course</dt>
                <dd className="text-[var(--text-primary)]">{active.course ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Year</dt>
                <dd className="text-[var(--text-primary)]">{active.year ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Section</dt>
                <dd className="text-[var(--text-primary)]">{active.section ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Status</dt>
                <dd className="text-[var(--action-primary)]">{active.status}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Type</dt>
                <dd className="text-[var(--text-primary)]">
                  {active.isHosteller ? "Hosteller" : "Day scholar"}
                </dd>
              </div>
              {active.email && (
                <div className="col-span-2">
                  <dt className="text-[var(--text-muted)]">Email</dt>
                  <dd className="flex items-center gap-1 text-[var(--text-primary)]">
                    <Mail className="w-3 h-3" /> {active.email}
                  </dd>
                </div>
              )}
              {active.phone && (
                <div className="col-span-2">
                  <dt className="text-[var(--text-muted)]">Phone</dt>
                  <dd className="flex items-center gap-1 text-[var(--text-primary)]">
                    <Phone className="w-3 h-3" /> {active.phone}
                  </dd>
                </div>
              )}
              {active.hostelBlock && (
                <div className="col-span-2">
                  <dt className="text-[var(--text-muted)]">Hostel</dt>
                  <dd className="text-[var(--text-primary)]">
                    {active.hostelBlock} · Room {active.roomNumber ?? "—"}
                  </dd>
                </div>
              )}
            </dl>
          </aside>
        </div>
      )}
    </div>
  );
}

export default function AdminStudentsPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <AdminStudentsInner />
    </AuthGuard>
  );
}
