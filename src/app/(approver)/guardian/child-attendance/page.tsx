"use client";

import { Suspense } from "react";
import { ChildWeeklyActivity } from "@/components/parent/ChildWeeklyActivity";
import { ChildStatus } from "@/components/parent/ChildStatus";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import {
  BarChart3
} from "lucide-react";

function ChildAttendanceInner() {
  return (
    <div className="min-w-0 space-y-6">
      <div>
        <p className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-emerald-400" />
          Child Attendance
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          7-day gate activity summary for your wards
        </p>
      </div>

      <WidgetBoundary title="Ward Status">
        <ChildStatus />
      </WidgetBoundary>

      <WidgetBoundary title="Weekly Gate Activity">
        <ChildWeeklyActivity />
      </WidgetBoundary>
    </div>
  );
}
export default function ChildAttendancePage() {
  return (
    <AuthGuard allowedRoles={['guardian', 'parent', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <ChildAttendanceInner />
      </Suspense>
    </AuthGuard>
  );
}
