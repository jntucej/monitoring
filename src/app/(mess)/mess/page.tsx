<<<<<<< HEAD
"use client";

export const dynamic = "force-dynamic";

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
=======
import { Suspense } from "react";
import { UtensilsCrossed } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { RoleDashboardPanel } from "@/components/approver/RoleDashboardPanel";

export default function MessPage() {
  return (
<<<<<<< HEAD
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
      
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">
            <UtensilsCrossed className="w-6 h-6 text-emerald-400 shrink-0" />
            <span className="truncate">Mess In-charge Dashboard</span>
          </p>
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
=======
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["mess_incharge", "admin", "sysadmin"]}>
        <div className="space-y-6">
          <DevContactStrip />
          <WidgetBoundary>
            <RoleDashboardPanel
              title="Mess Incharge dashboard"
              icon={UtensilsCrossed}
              endpoint="/api/mess/analytics"
              mapKpis={(raw: any) => {
                const d = raw ?? {};
                const declared = d.declaredPresent ?? 0;
                const confirmed = d.confirmedPresent ?? 0;
                const rate = declared > 0 ? Math.round((confirmed / declared) * 100) : 0;
                return [
                  { label: "Declared", value: declared },
                  { label: "Confirmed", value: confirmed, tone: "ok" as const },
                  { label: "Attendance", value: `${rate}%`, tone: rate >= 80 ? "ok" as const : rate >= 50 ? "warn" as const : "danger" as const },
                  { label: "Meal date", value: d.mealDate ?? "—" },
                ];
              }}
            />
          </WidgetBoundary>
          <WidgetBoundary><AttentionQueue /></WidgetBoundary>
          <WidgetBoundary><PersonalizedCampusHome /></WidgetBoundary>
          <WidgetBoundary><TaskContinuity /></WidgetBoundary>
          <WidgetBoundary><UnifiedCampusCalendar /></WidgetBoundary>
          <WidgetBoundary><ActivityTimeline /></WidgetBoundary>
          <WidgetBoundary><QuickActions /></WidgetBoundary>
          <WidgetBoundary><NotificationCenter /></WidgetBoundary>
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
        </div>
      </AuthGuard>
    </Suspense>
  );
}
