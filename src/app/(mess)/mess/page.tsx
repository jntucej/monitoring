"use client";

import { Suspense, useCallback } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  Building2,
  CalendarDays,
  Loader2,
  AlertTriangle,
  Inbox,
  ShieldCheck,
} from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { DigitalHandover } from "@/components/retention/DigitalHandover";
import { CampusFeedbackDesk } from "@/components/retention/CampusFeedbackDesk";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { CampusFeed } from "@/components/engagement/CampusFeed";
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";

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
        <Inbox className="w-4 h-4 text-slate-500 shrink-0" />
        <span className="text-sm font-semibold text-white truncate">{title}</span>
      </div>
      <div className="p-6 text-center">
        <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500 max-w-md mx-auto">{message}</p>
      </div>
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
      <button type="button"
                onClick={onRetry}
        className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
      >
        Retry
      </button>
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

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
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
            value={activeDeptCount}
            sub="Departments with students or faculty"
            accent="text-sky-400"
            loading={deptLoading && !departments}
          />
          <StatCard
            icon={ShieldCheck}
            label="Lockdown"
            value={lockdownActive ? "Active" : "None"}
            sub={lockdownActive ? lockdown?.data?.label ?? "In effect" : "All gates operational"}
            accent={lockdownActive ? "text-rose-400" : "text-emerald-400"}
            loading={lockdownLoading && !lockdown}
          />
          <StatCard
            icon={UtensilsCrossed}
            label="Menu Items"
            value={menuHasDay ? String(menuItemCount) : "0"}
            sub={menuHasDay ? `${menuData?.items.filter((i) => i.isAvailable).length} available` : undefined}
            accent="text-emerald-400"
            loading={menuLoading && !menu}
          />
          <StatCard
            icon={CalendarDays}
            label="Next Meal Day"
            value={menuHasDay ? "Scheduled" : "None"}
            sub={menuHasDay ? fmtDate(menuData?.mealDate) : "No meal day published"}
            accent="text-amber-400"
            loading={menuLoading && !menu}
          />
        </div>
      </WidgetBoundary>

      {/* Mess Sections */}
      <WidgetBoundary title="Mess Sections">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
          {[
            { href: "/mess/daily-meal-counts", label: "Daily Meal Counts", sub: "Per-day serving counts" },
            { href: "/mess/meal-attendance", label: "Meal Attendance", sub: "Declared vs confirmed" },
            { href: "/mess/menu-management", label: "Menu Management", sub: "Current meal-day menu" },
            { href: "/mess/inventory-stock", label: "Inventory & Stock", sub: "Item catalog stock state" },
            { href: "/mess/consumption-reports", label: "Consumption Reports", sub: "Serving trends by day" },
            { href: "/mess/mess-issues", label: "Mess Issues", sub: "Exception events feed" },
            { href: "/mess/operational-requests", label: "Operational Requests", sub: "Supply, equipment, safety queue" },
            { href: "/mess/scan", label: "Token Scanner", sub: "Scan or serve mess tokens" },
          ].map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-xl border border-slate-800 bg-[#111827] p-3 hover:border-slate-600 transition-colors min-w-0"
            >
              <p className="text-sm font-semibold text-white truncate">{s.label}</p>
              <p className="text-xs text-slate-500 min-w-0">{s.sub}</p>
            </Link>
          ))}
        </div>
      </WidgetBoundary>

      {/* Shared action & notification surfaces */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 min-w-0">
        <QuickActions />
        <NotificationCenter />
      </div>

      <AttentionQueue />
      <ActivityTimeline />

      {/* Campus engagement feed */}
      <CampusFeed />

      {/* Personalized campus home (retention) */}
      <PersonalizedCampusHome />

      {/* Task continuity */}
      <TaskContinuity />

      {/* Digital handover + feedback desk */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 min-w-0">
        <DigitalHandover />
        <CampusFeedbackDesk />
      </div>

      {/* Unified campus calendar */}
      <UnifiedCampusCalendar />

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
