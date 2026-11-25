/**
 * Campus Engagement module page — hosts the student/staff-facing
 * engagement widgets. Wrapped in GuardedPage so unauthenticated
 * visitors or out-of-scope roles are redirected to their default
 * route. All data shown here flows through /api/campus/* routes
 * that re-check the caller's identity and role server-side.
 */
import { Suspense } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { AppLoadingScreen } from "@/components/shared/AppLoadingScreen";
import { DynamicHeader } from "@/components/shared/DynamicHeader";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { EngagementWidgets } from "@/components/engagement/EngagementWidgets";

export default function CampusEngagementPage() {
  return (
    <GuardedPage>
      <DynamicHeader />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <ContextSituationBar
          roleLabel="Campus Community"
          purpose="Track your campus engagement, personal achievements, announcements, and activity feeds."
          contextLabel="Campus Life Hub"
          statusTone="ok"
          statusPill="Active Hub"
          statusSummary="Explore real-time event updates, meal schedules, peer feeds, and personalized semester milestones."
          primaryAction={{ label: "Personal Profile", href: "/profile/personal" }}
          secondaryAction={{ label: "Security & Passes", href: "/person" }}
        />
      </div>
      <Suspense fallback={<AppLoadingScreen />}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-10">
          <EngagementWidgets />
        </div>
      </Suspense>
    </GuardedPage>
  );
}
