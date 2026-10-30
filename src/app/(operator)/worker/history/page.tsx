import { Suspense } from "react";
import { OperatorPageLoading } from "@/components/operator/shared/OperatorLoading";
import { OperatorWidgetBoundary } from "@/components/operator/shared/OperatorWidgetBoundary";
import { MyWorkPanel } from "@/components/approver/MyWorkPanel";

export default function WorkerHistoryPage() {
  return (
    <Suspense fallback={<OperatorPageLoading />}>
      <OperatorWidgetBoundary>
        <MyWorkPanel />
      </OperatorWidgetBoundary>
    </Suspense>
  );
}
