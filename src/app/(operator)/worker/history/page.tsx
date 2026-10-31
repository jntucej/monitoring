import { Suspense } from "react";
import { OperatorPageLoading } from "@/components/operator/shared/OperatorLoading";
import { OperatorWidgetBoundary } from "@/components/operator/shared/OperatorWidgetBoundary";
import { MyWorkPanel } from "@/components/approver/MyWorkPanel";

export default function WorkerHistoryPage() {
  return (
    <Suspense fallback={<OperatorPageLoading />}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 py-6 min-w-0">
        <OperatorWidgetBoundary>
          <MyWorkPanel />
        </OperatorWidgetBoundary>
      </div>
    </Suspense>
  );
}
