import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { VALID_TABS, HealthTabContent } from "./HealthTabClient";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
type Tab = (typeof VALID_TABS)[number];

/**
 * Server component: validates the [tab] param and renders the client
 * content. Invalid tab → 404.
 */
export default async function HealthTabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  if (!VALID_TABS.includes(tab as Tab)) notFound();

  return (
    <Suspense fallback={<PageLoading />}>
      <div className="space-y-4 p-4 sm:p-6">
        <ContextSituationBar
          roleLabel="System Admin"
          purpose="Inspect the active health tab for a specific subsystem in detail."
          contextLabel={"System Health · " + (tab as string)}
          why="Use the breadcrumbs to navigate between database, worker, cache, and API health views."
          statusSummary="Review the live metrics for this subsystem and follow up on any red items below."
          primaryAction={{ label: "All Subsystems", href: "/sysadmin/application-health" }}
        />
        <HealthTabContent tab={tab as Tab} />
      </div>
    </Suspense>
  );
}
