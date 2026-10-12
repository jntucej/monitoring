"use client";

import { Suspense, useCallback } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  Building2,
  CalendarDays,
  Clock,
  Eye,
  Loader2,
  AlertTriangle,
  Lock,
  Inbox,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";

/**
 * Mess In-charge dedicated dashboard — mess-operations focused, NOT a broad
 * institutional dashboard.
 *
 * Data sources (all verified 200 for the mess_incharge role):
 *   • /api/departments — active department count
 *   • /api/lockdown/active — current lockdown state
 *   • /api/mess/menu — next active meal-day menu items, window times
 *
 * Endpoints that are 403 for mess_incharge (/api/staff/attendance,
 * /api/attendance_records, /api/alerts, /api/principal/audit,
 * /api/mess/days, /api/mess/menu-items, and everything under /api/admin/*)
 * are NEVER fetched — restricted panels render a clean "restricted / not
 * exposed at this tier" empty-state instead of a 403 banner.
 *
 * Endpoints that do not exist (/api/mess/counts, /api/inventory,
 * /api/consumption, /api/audit) are likewise not called.
 */

/* ── response shapes ──────────────────────────────────────────────────────── */

interface DepartmentRow {
  code: string;
  name: string;
  hod: string;
  totalStudents: number;
  facultyCount: number;
}

interface DepartmentsResponse {
  success: boolean;
  data: DepartmentRow[];
}

interface LockdownResponse {
  success: boolean;
  data: null | { label: string; reason?: string; until?: string };
}

interface MenuResponse {
  success: boolean;
  data: {
    mealDate: string | null;
    windowOpens: string | null;
    windowCloses: string | null;
    messDayId: string | null;
    items: Array<{
      id: string;
      code: string;
      label: string;
      sortOrder: number;
      isAvailable: boolean;
    }>;
  };
}

/* ── building blocks ──────────────────────────────────────────────────────── */

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
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 text-slate-400 min-w-0">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide truncate">{label}</span>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
      ) : (
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-slate-500 min-w-0">{sub}</p>}
    </div>
  );
}

function RestrictedEmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
        <Lock className="w-4 h-4 text-slate-500 shrink-0" />
        <span className="text-sm font-semibold text-white truncate">{title}</span>
      </div>
      <div className="p-6 text-center">
        <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500 max-w-md mx-auto">{message}</p>
      </div>
    </div>
  );
}

function WidgetShell({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
        <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-sm font-semibold text-white truncate">{title}</span>
      </div>
      <div className="p-4 min-w-0">{children}</div>
    </div>
  );
}

function WidgetError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
      <span className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </span>
      <button
        onClick={onRetry}
        className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
      >
        Retry
      </button>
    </div>
  );
}

function WidgetLoading() {
  return (
    <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
      <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading…
    </div>
  );
}

function fmtTime(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "No meal day scheduled";
  try {
    return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

/* ── main content ─────────────────────────────────────────────────────────── */

function MessDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "mess_incharge") as Role;
  const tier = getRoleTier(role);

  /* data sources — all 200 for mess_incharge */
  const {
    data: departments,
    loading: deptLoading,
    error: deptError,
    refresh: refreshDepts,
  } = useApiResource<DepartmentsResponse>("/api/departments", { ttlMs: 30_000 });

  const {
    data: lockdown,
    loading: lockdownLoading,
    error: lockdownError,
    refresh: refreshLockdown,
  } = useApiResource<LockdownResponse>("/api/lockdown/active", { ttlMs: 30_000 });

  const {
    data: menu,
    loading: menuLoading,
    error: menuError,
    refresh: refreshMenu,
  } = useApiResource<MenuResponse>("/api/mess/menu", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([refreshDepts(), refreshLockdown(), refreshMenu()]);
  }, [refreshDepts, refreshLockdown, refreshMenu]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const deptRows = departments?.data ?? [];
  const activeDeptCount = deptRows.filter((d) => d.totalStudents > 0 || d.facultyCount > 0).length;
  const lockdownActive = lockdown?.data != null;

  const menuData = menu?.data;
  const menuItems = menuData?.items ?? [];
  const menuItemCount = menuItems.length;
  const menuHasDay = Boolean(menuData?.mealDate);

  const anyLoading = (deptLoading || lockdownLoading || menuLoading) && !departments && !lockdown && !menu;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-emerald-400 shrink-0" />
            <span className="truncate">Mess In-charge Dashboard</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          onClick={() => void refreshAll()}
          disabled={deptLoading || lockdownLoading || menuLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 shrink-0"
        >
          {deptLoading || lockdownLoading || menuLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {deptLoading || lockdownLoading || menuLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* global error banner */}
      {(deptError || lockdownError || menuError) && (
        <WidgetError
          message={`Data loading failed: ${deptError || lockdownError || menuError}`}
          onRetry={() => void refreshAll()}
        />
      )}

      {/* 1 · Mess Overview — KPI row */}
      <WidgetBoundary title="Mess Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard
            icon={Building2}
            label="Active Departments"
            value={anyLoading ? "—" : activeDeptCount}
            sub="Departments with students or faculty"
            accent="text-sky-400"
            loading={deptLoading && !departments}
          />
          <StatCard
            icon={ShieldCheck}
            label="Lockdown"
            value={
              lockdownLoading && !lockdown ? "—" : lockdownActive ? "Active" : "None"
            }
            sub={lockdownActive ? lockdown?.data?.label ?? "In effect" : "All gates operational"}
            accent={lockdownActive ? "text-rose-400" : "text-emerald-400"}
            loading={lockdownLoading && !lockdown}
          />
          <StatCard
            icon={UtensilsCrossed}
            label="Menu Items"
            value={menuLoading && !menu ? "—" : menuHasDay ? String(menuItemCount) : "0"}
            sub={
              menuHasDay
                ? `${menuData?.items.filter((i) => i.isAvailable).length} available`
                : undefined
            }
            accent="text-emerald-400"
            loading={menuLoading && !menu}
          />
          <StatCard
            icon={CalendarDays}
            label="Next Meal Day"
            value={menuLoading && !menu ? "—" : menuHasDay ? "Scheduled" : "None"}
            sub={menuHasDay ? fmtDate(menuData?.mealDate) : "No meal day published"}
            accent="text-amber-400"
            loading={menuLoading && !menu}
          />
        </div>
      </WidgetBoundary>

      {/* 2 · Daily Meal Counts */}
      <WidgetBoundary title="Daily Meal Counts">
        <RestrictedEmptyState
          title="Daily Meal Counts"
          message="Daily meal counts are not exposed at this tier. No dedicated meal-count endpoint is available to the Mess In-charge role."
        />
      </WidgetBoundary>

      {/* 3 · Meal Attendance */}
      <WidgetBoundary title="Meal Attendance">
        <RestrictedEmptyState
          title="Meal Attendance"
          message="Meal attendance is restricted at this tier. Staff and hosteller attendance records are not accessible to the Mess In-charge role."
        />
      </WidgetBoundary>

      {/* 4 · Menu Management */}
      <WidgetBoundary title="Menu Management">
        <WidgetShell title="Current Menu" icon={UtensilsCrossed}>
          {menuLoading && !menu ? (
            <WidgetLoading />
          ) : menuError ? (
            <WidgetError message={menuError} onRetry={() => void refreshMenu()} />
          ) : menuHasDay && menuItems.length > 0 ? (
            <div className="space-y-4 min-w-0">
              {/* Meal-day window */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <CalendarDays className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {fmtDate(menuData?.mealDate)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Window: {fmtTime(menuData?.windowOpens)} – {fmtTime(menuData?.windowCloses)}
                    </p>
                  </div>
                </div>
                <div className="flex-1" />
                <Link
                  href="/mess/scan"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" /> Token Scanner
                </Link>
              </div>

              {/* Items table */}
              <div className="overflow-x-auto min-w-0">
                <table className="w-full text-sm min-w-[360px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                      <th className="text-left px-3 py-2.5">Item</th>
                      <th className="text-left px-3 py-2.5">Code</th>
                      <th className="text-left px-3 py-2.5">Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {menuItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-3 py-2.5 text-slate-200 font-medium min-w-0 truncate">
                          {item.label}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 font-mono text-xs whitespace-nowrap">
                          {item.code}
                        </td>
                        <td className="px-3 py-2.5">
                          {item.isAvailable ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 whitespace-nowrap">
                              Available
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-rose-400/30 bg-rose-400/10 text-rose-400 whitespace-nowrap">
                              Unavailable
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-slate-500">
                {menuItems.length} item{menuItems.length !== 1 ? "s" : ""} ·{" "}
                {menuData?.items.filter((i) => i.isAvailable).length} available · Edit actions
                run from the approvals desk.
              </p>
            </div>
          ) : menuHasDay ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-400">Menu day is scheduled but no items are published yet.</p>
            </div>
          ) : (
            <div className="text-center py-6">
              <Inbox className="w-5 h-5 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No menu published yet.</p>
            </div>
          )}
        </WidgetShell>
      </WidgetBoundary>

      {/* 5 · Inventory and Stock */}
      <WidgetBoundary title="Inventory and Stock">
        <RestrictedEmptyState
          title="Inventory and Stock"
          message="Inventory and stock levels are not exposed at this tier. No dedicated inventory endpoint is available to the Mess In-charge role."
        />
      </WidgetBoundary>

      {/* 6 · Consumption Reports */}
      <WidgetBoundary title="Consumption Reports">
        <RestrictedEmptyState
          title="Consumption Reports"
          message="Consumption reports are not exposed at this tier. No dedicated consumption-report endpoint is available to the Mess In-charge role."
        />
      </WidgetBoundary>

      {/* 7 · Mess Issues */}
      <WidgetBoundary title="Mess Issues">
        <RestrictedEmptyState
          title="Mess Issues"
          message="Mess issues and the incident feed are admin-scoped. The Mess In-charge role does not have access to the alerts and incident endpoint."
        />
      </WidgetBoundary>

      {/* 8 · Authority note */}
      <WidgetBoundary title="Authority">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-sm font-semibold text-white">Authority Scope</span>
              </div>
              <p className="text-sm text-slate-400 max-w-2xl min-w-0">
                Mess In-charge accesses permitted meal counts and mess operations.
                Detailed gate movements are not exposed unless explicitly required and authorised.
              </p>
            </div>
            <a
              href="/hostel/permissions"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
            >
              Mess Approvals Desk <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function MessDashboardPage() {
  return (

      <Suspense fallback={<PageLoading />}>
        <MessDashboardInner />
      </Suspense>
    
  );
}
