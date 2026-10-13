"use client";

export const dynamic = "force-dynamic";

import { Suspense, useMemo, useState } from "react";
import {
  ShieldCheck,
  Users,
  Lock,
  RefreshCw,
  AlertTriangle,
  Loader2,
  GraduationCap,
  Search,
  X,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleHierarchyGraph, ROLE_HIERARCHY } from "@/components/shared/RoleHierarchyGraph";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";

/* ── /api/roles-graph response shape ─────────────────────────────────────── */

interface RoleGraphNode {
  code: string;
  display_name: string;
  description?: string;
  icon_name?: string;
  default_redirect?: string;
  user_count: number;
  on_campus: number;
}

interface RolesGraphData {
  root: string;
  nodes: RoleGraphNode[];
  edges: { parent: string; child: string }[];
  user_counts: Record<string, number>;
  on_campus_counts: Record<string, number>;
  totals: { roles: number; users: number; onCampus: number };
  generated_at?: string;
}

/* ── shared bits ─────────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  sub,
  accent = false,
  loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3.5 ${
        accent ? "bg-emerald-500/[0.07] border-emerald-500/25" : "bg-[#0d1220] border-slate-800"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`mt-1.5 text-xl font-black tabular-nums ${accent ? "text-emerald-400" : "text-white"}`}>
        {loading ? <span className="inline-block w-10 h-5 rounded bg-slate-800 animate-pulse" /> : value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

/* ── main dashboard ──────────────────────────────────────────────────────── */

type FilterKey = "all" | "staff" | "students" | "on-campus";

/** Coarse role buckets used by the quick-filter chips. */
const FILTER_ROLES: Record<Exclude<FilterKey, "all">, string[]> = {
  staff: ["admin", "sysadmin", "principal", "vice_principal", "hod", "supervisor", "operator", "faculty", "staff", "worker"],
  students: ["student", "parent", "guardian"],
  "on-campus": [],
};

function AdminRolesInner() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const res = useApiResource<RolesGraphData>("/api/roles-graph", { ttlMs: 20_000 });

  usePolling(
    () => {
      clearCache("/api/roles-graph");
      return res.refresh();
    },
    { intervalMs: 60_000 }
  );

  const counts = useMemo(() => {
    const m: Record<string, { members: number; onCampus: number }> = {};
    for (const code of Object.keys(ROLE_HIERARCHY)) {
      m[code] = {
        members: res.data?.user_counts?.[code] ?? 0,
        onCampus: res.data?.on_campus_counts?.[code] ?? 0,
      };
    }
    return m;
  }, [res.data]);

  const displayName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const n of res.data?.nodes ?? []) map[n.code] = n.display_name;
    return (code: string) => map[code] || code.replace(/_/g, " ");
  }, [res.data]);

  /* visible role codes after applying filter + search */
  const visibleCodes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const codes = Object.keys(ROLE_HIERARCHY);
    return codes.filter((code) => {
      const bucket = filter === "all" ? codes : FILTER_ROLES[filter];
      const inBucket = filter === "on-campus" ? (counts[code].onCampus > 0) : bucket.includes(code);
      if (!inBucket) return false;
      if (!q) return true;
      return (
        code.toLowerCase().includes(q) ||
        displayName(code).toLowerCase().includes(q)
      );
    });
  }, [filter, query, counts, displayName]);

  /* The graph component renders the full DAG; we hide non-matching nodes by
   * collapsing them — simpler: pass counts through and render a filtered
   * node list beside the mind map when filters are active. */
  const filteredNodeRows = useMemo(
    () =>
      (res.data?.nodes ?? [])
        .filter((n) => visibleCodes.includes(n.code))
        .sort((a, b) => b.user_count - a.user_count),
    [res.data, visibleCodes]
  );

  const totals = res.data?.totals;
  const loading = res.loading && !res.data;

  const clearFilters = () => {
    setQuery("");
    setFilter("all");
  };

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All roles" },
    { key: "staff", label: "Campus staff" },
    { key: "students", label: "Students & family" },
    { key: "on-campus", label: "On campus now" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-white truncate">
                Roles &amp; Hierarchy
              </h1>
              <p className="text-[11px] text-slate-500">
                Read-only role mind map, member counts and in-campus presence
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              clearCache("/api/roles-graph");
              void res.refresh();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-bold transition shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${res.loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Totals */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Roles defined" value={totals ? String(totals.roles) : "—"} loading={loading} sub="in config registry" />
          <StatCard label="Total users" value={totals ? String(totals.users) : "—"} loading={loading} sub="across all roles" />
          <StatCard
            label="In campus now"
            value={totals ? String(totals.onCampus) : "—"}
            loading={loading}
            accent
            sub="current_status = IN"
          />
          <StatCard
            label="Top role"
            value={
              res.data?.nodes?.length
                ? displayName(
                    [...res.data.nodes].sort((a, b) => b.user_count - a.user_count)[0].code
                  ).split(" ")[0]
                : "—"
            }
            loading={loading}
            sub={
              res.data?.nodes?.length
                ? `${[...res.data.nodes].sort((a, b) => b.user_count - a.user_count)[0].user_count} members`
                : "—"
            }
          />
        </div>
      </div>

      {res.error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">Failed to load role graph: {res.error}</span>
          <button
            onClick={() => void res.refresh()}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-3 sm:p-4 space-y-3">
        <div className="flex gap-1.5 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                filter === f.key
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                  : "bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
          {(query || filter !== "all") && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 hover:text-white whitespace-nowrap"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by role code or name…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Mind map — the full hierarchy DAG. Hidden rows: when a filter is
          active the graph still shows the full tree, but dim non-matching
          nodes via a CSS class passed down — we keep it simple and always
          render the full tree (it's read-only context). */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-4 sm:p-5 space-y-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">Role Hierarchy Mind Map</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Authorization DAG from sysadmin down to end roles. Counts refresh every 60s.
          </p>
        </div>
        {loading ? (
          <div className="py-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          </div>
        ) : (
          <div className={`space-y-3 ${filter !== "all" || query ? "opacity-60" : ""}`}>
            <RoleHierarchyGraph counts={counts} />
          </div>
        )}
      </div>

      {/* Per-role table (filtered) */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Per-Role Breakdown
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {filteredNodeRows.length} role{filteredNodeRows.length === 1 ? "" : "s"}
              {(filter !== "all" || query) ? " matching filter" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3" /> members
            </span>
            <span className="inline-flex items-center gap-1">
              <Lock className="w-3 h-3" /> in campus
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          </div>
        ) : filteredNodeRows.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">No roles match the current filter.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 pr-2">Role</th>
                  <th className="py-2.5 px-2">Code</th>
                  <th className="py-2.5 px-2">Reports To</th>
                  <th className="py-2.5 px-2 text-right">Members</th>
                  <th className="py-2.5 px-2 text-right">In Campus</th>
                  <th className="py-2.5 pl-2 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredNodeRows.map((n) => {
                  const parent =
                    (res.data?.edges ?? []).find((e) => e.child === n.code)?.parent;
                  const pct =
                    n.user_count > 0
                      ? Math.min(100, Math.round((n.on_campus / n.user_count) * 100))
                      : 0;
                  return (
                    <tr key={n.code} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 pr-2">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="font-semibold text-white text-xs">
                            {displayName(n.code)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="font-mono text-[11px] text-slate-400 bg-slate-800/60 border border-slate-700 rounded px-1.5 py-0.5">
                          {n.code}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-[11px] text-slate-500 font-mono">
                        {parent ? parent : "— root —"}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-white">
                        {n.user_count}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                        <span className={n.on_campus > 0 ? "text-emerald-400" : "text-slate-600"}>
                          {n.on_campus}
                        </span>
                      </td>
                      <td className="py-2.5 pl-2">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-14 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-500 tabular-nums w-8 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminRolesPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin", "principal", "vice_principal"]}>
      <Suspense
        fallback={
          <div className="p-8 flex items-center justify-center min-h-[50vh]">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <AdminRolesInner />
      </Suspense>
    </AuthGuard>
  );
}
