"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { TodayStatus } from "@/components/student/home/TodayStatus";
import { ActivePassCard } from "@/components/student/home/ActivePassCard";
import { ContextCard } from "@/components/student/home/ContextCard";
import { QuickLinksRow } from "@/components/student/home/QuickLinksRow";
import { GuardianCallButton } from "@/components/student/home/GuardianCallButton";
import { CampusPulseStrip } from "@/components/student/home/CampusPulseStrip";

// Home is a status, not a dashboard: three cards above the fold,
// everything else one tap away (QuickLinksRow → /student/* sub-routes).
// No widget was deleted — the 18-widget stack was relocated to
// /student/campus, /student/activity, /student/achievements and
// /student/knowledge.
function StudentHomeInner() {
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-3 md:p-5">
      <WidgetBoundary name="today-status" resetKey="student-home">
        <TodayStatus />
      </WidgetBoundary>
      <WidgetBoundary name="active-pass" resetKey="student-home">
        <ActivePassCard />
      </WidgetBoundary>
      <WidgetBoundary name="context" resetKey="student-home">
        <ContextCard />
      </WidgetBoundary>
      <WidgetBoundary name="quick-links" resetKey="student-home">
        <QuickLinksRow />
      </WidgetBoundary>
      <WidgetBoundary name="guardian-call" resetKey="student-home">
        <GuardianCallButton />
      </WidgetBoundary>
      <WidgetBoundary name="campus-pulse" resetKey="student-home">
        <CampusPulseStrip />
      </WidgetBoundary>
    </div>
  );
}

export default function StudentHome() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StudentHomeInner />
    </Suspense>
  );
}
