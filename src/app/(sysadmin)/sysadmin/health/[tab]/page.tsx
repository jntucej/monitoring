import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { VALID_TABS, HealthTabContent } from "./HealthTabClient";
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
      <HealthTabContent tab={tab as Tab} />
    </Suspense>
  );
}
