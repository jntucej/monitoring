import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { MyWorkPanel } from "@/components/approver/MyWorkPanel";

export default function WorkerHistoryPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WidgetBoundary>
        <MyWorkPanel />
      </WidgetBoundary>
    </Suspense>
  );
}
