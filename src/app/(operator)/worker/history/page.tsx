import { Suspense } from "react";
import { OperatorPageLoading } from "@/components/operator/shared/OperatorLoading";
import { OperatorWidgetBoundary } from "@/components/operator/shared/OperatorWidgetBoundary";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { MyWorkPanel } from "@/components/approver/MyWorkPanel";

export default function WorkerHistoryPage() {
  return (
    <Suspense fallback={<OperatorPageLoading />}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 py-6 min-w-0">
        <ContextSituationBar
          roleLabel="Campus Operator · Worker"
          purpose="Historical logs of completed maintenance tasks, past work orders, and gate shifts."
          contextLabel="Operator History"
          statusTone="info"
          statusSummary="Browse historical task completions, verify resolved work orders, or return to active duties."
          primaryAction={{ label: "Today's Dashboard", href: "/worker" }}
          secondaryAction={{ label: "Active Work Orders", href: "/worker/work-orders" }}
        />
        <OperatorWidgetBoundary>
          <MyWorkPanel />
        </OperatorWidgetBoundary>
      </div>
    </Suspense>
  );
}
