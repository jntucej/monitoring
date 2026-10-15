"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PermissionList } from "@/components/approver/PermissionList";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { AuthGuard } from "@/components/shared/AuthGuard";
import {
  Building2,
  Inbox,
  MoonStar,
  Users,
  AlertTriangle,
  Loader2,

} from "lucide-react";

/* ── response shapes (mirror the route handlers — all read-only) ── */

interface PermissionsResponse {
  success: boolean;
  data: Array<{
    id: string;
    ticket_number: string;
    workflow_type: string;
    current_stage: string;
    status: string;
    sla_deadline?: string | null;
    student?: {
      name: string;
      student_details?: { roll?: string; hostel_block?: string } | null;
    } | null;
  }>;
  total?: number;
}

interface PresenceMatrixData {
  gates: Array<{ id: string; name: string; code: string; audience: string; type: string }>;
  roles: string[];
  matrix: Record<string, Record<string, number>>;
  lastUpdated: string;
}

interface PresenceMatrixResponse {
  success: boolean;
  data: PresenceMatrixData;
}

/* ── building blocks ── */

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-white",
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
      ) : (
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2">
      <span className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        {message}
      </span>
      <button
        onClick={onRetry}
        className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20"
      >
        Retry
      </button>
    </div>
  );
}

function curfewState(): { active: boolean; label: string; detail: string } {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = 21 * 60 + 30; // 21:30
  const end = 6 * 60; // 06:00
  const active = minutes >= start || minutes < end;
  return {
    active,
    label: active ? "In Effect" : "Not Active",
    detail: active
      ? "Curfew window 21:30 – 06:00 · students must be on campus"
      : "Window opens at 21:30 · night entry restricted",
  };
}

/* ── main content ── */

function HostelPermissionsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "caretaker") as Role;
  const tier = getRoleTier(role);
  const curfew = curfewState();

  // Pending hostel outpasses at the caller's own stage (server filters by role).
  const {
    data: permissions,
    loading: permLoading,
    error: permError,
    refresh: refreshPerms,
  } = useApiResource<PermissionsResponse>("/api/permissions?workflowType=hostel&status=PENDING", {
    ttlMs: 30_000,
  });

  // Gate × role presence matrix (live occupancy heatmap source).
  const {
    data: presence,
    loading: presenceLoading,
    error: presenceError,
    refresh: refreshPresence,
  } = useApiResource<PresenceMatrixResponse>("/api/occupancy/presence-matrix", {
    ttlMs: 30_000,
  });

  const refresh = useCallback(async () => {
    clearCache();
    await Promise.all([refreshPerms(), refreshPresence()]);
  }, [refreshPerms, refreshPresence]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const pendingRows = permissions?.data ?? [];
  const pendingCount = permissions?.total ?? pendingRows.length;
  const slaBreached = pendingRows.filter(
    (r) => r.sla_deadline && new Date(r.sla_deadline).getTime() < Date.now()
  ).length;

  const matrix = presence?.data?.matrix ?? {};
  const gates = presence?.data?.gates ?? [];
  const roles = presence?.data?.roles ?? [];
  const studentsInside = gates.reduce(
    (sum, g) => sum + (matrix[g.id]?.student ?? 0),
    0
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* header */}
      {/* Page toolbar — global DynamicHeader already renders the app header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {/* error banners — presence matrix may 403 for hostel roles; render gracefully */}
      {presenceError && (
        <ErrorBanner
          message={`Hostel occupancy loading failed (${presenceError}) — the live presence matrix needs role access; other data below still works.`}
          onRetry={() => void refreshPresence()}
        />
      )}
      {permError && (
        <ErrorBanner
          message={`Hostel pass queue loading failed: ${permError}`}
          onRetry={() => void refreshPerms()}
        />
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Students On Campus"
          value={presence ? studentsInside : "…"}
          sub={presence ? `Live across ${gates.length} gates · updated ${new Date(presence.data.lastUpdated).toLocaleTimeString()}` : "Presence matrix unavailable"}
          accent="text-emerald-400"
          loading={presenceLoading && !presence}
        />
        <StatCard
          icon={Inbox}
          label="Pending Hostel Passes"
          value={pendingCount}
          sub={`At your stage (${role})`}
          accent="text-sky-400"
          loading={permLoading && !permissions}
        />
        <StatCard
          icon={AlertTriangle}
          label="SLA Breached"
          value={slaBreached}
          sub="Passes past their 48h approval deadline"
          accent="text-amber-400"
          loading={permLoading && !permissions}
        />
        <StatCard
          icon={MoonStar}
          label="Curfew"
          value={curfew.label}
          sub={curfew.detail}
          accent={curfew.active ? "text-violet-400" : "text-emerald-400"}
        />
      </div>

      {/* occupancy heatmap — gate × role matrix */}
      <WidgetBoundary title="Hostel Occupancy">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              Live Gate Occupancy
            </h2>
            {presence?.data && (
              <span className="ml-auto text-xs text-slate-500">
                updated {new Date(presence.data.lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>
          {presenceLoading ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading occupancy…
            </div>
          ) : presence ? (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Gate</th>
                    {roles.map((r) => (
                      <th key={r} className="text-right px-4 py-3 capitalize">
                        {r}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {gates.map((g) => {
                    const row = matrix[g.id] ?? {};
                    const total = Object.values(row).reduce((a, b) => a + b, 0);
                    return (
                      <tr key={g.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-white font-medium">
                          {g.name}
                          <span className="ml-2 text-xs text-slate-500 font-mono">{g.code}</span>
                        </td>
                        {roles.map((r) => (
                          <td
                            key={r}
                            className={`px-4 py-3 text-right font-mono text-xs ${
                              row[r] > 0 ? "text-emerald-400" : "text-slate-600"
                            }`}
                          >
                            {row[r] ?? 0}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right font-mono text-xs text-slate-400">{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="Occupancy data unavailable. The presence matrix service did not respond for your role." />
          )}
        </div>
      </WidgetBoundary>

      {/* pending hostel passes */}
      <WidgetBoundary title="Hostel Pass Queue">
        <PermissionList
          workflowType="hostel"
          title="Hostel Permissions"
          subtitle={`Pending hostel outpasses at stage “${role}” — approve, reject or escalate`}
          initialPermissions={pendingRows as never[]}
        />
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}
export default function HostelPermissionsPage() {
  return (
    <AuthGuard allowedRoles={['hostel', 'hostel_manager', 'deputy_warden', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <HostelPermissionsInner />
      </Suspense>
    </AuthGuard>
  );
}
