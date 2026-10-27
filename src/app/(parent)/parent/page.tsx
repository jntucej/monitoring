<<<<<<< HEAD
"use client";

export const dynamic = "force-dynamic";

import { ChildStatus } from "@/components/parent/ChildStatus";
import { ChildActivity } from "@/components/parent/ChildActivity";
import { ChildWeeklyActivity } from "@/components/parent/ChildWeeklyActivity";
import { RequestPassForm } from "@/components/parent/RequestPassForm";
=======
import { Suspense } from "react";
import { Users } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { RoleDashboardPanel } from "@/components/approver/RoleDashboardPanel";

export default function ParentPage() {
  return (
<<<<<<< HEAD
    <div className="space-y-6 min-w-0">
      <div>
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">
          <span className="sm:hidden">👨‍👩‍👧</span>
          <span className="hidden sm:inline">👨‍👩‍👧 Parent Dashboard</span>
        </p>
        <p className="text-[var(--text-muted)] hidden sm:block">
          Monitor your child&apos;s campus activity
          {user?.name ? ` · signed in as ${user.name}` : ""}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Some panels unavailable: {error}</span>
          </span>
          <button
            onClick={() => void refresh()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/30"
          >
            Retry
          </button>
=======
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["parent", "guardian"]}>
        <div className="space-y-6">
          <DevContactStrip />
          <WidgetBoundary>
            <RoleDashboardPanel
              title="Parent dashboard"
              icon={Users}
              endpoint="/api/parents/me"
              mapKpis={(raw: any) => {
                const d = raw ?? {};
                const children = Array.isArray(d.children) ? d.children.length : 0;
                return [
                  { label: "Children", value: children },
                  { label: "Open requests", value: d.totalOpenRequests ?? 0, tone: "warn" as const },
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
