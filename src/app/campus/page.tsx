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
import { EngagementWidgets } from "@/components/engagement/EngagementWidgets";

export default function CampusEngagementPage() {
  return (
    <GuardedPage>
      <DynamicHeader />
      <Suspense fallback={<AppLoadingScreen />}>
        <EngagementWidgets />
      </Suspense>
    </GuardedPage>
  );
}
