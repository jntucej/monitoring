"use client";

import { Suspense } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { Inbox } from "lucide-react";

function MessMealCountsInner() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Daily Meal Counts">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <Inbox className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Daily Meal Counts</span>
          </div>
          <div className="p-6 text-center">
            <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500 max-w-md mx-auto min-w-0">
              Daily meal counts are not exposed at this tier. No dedicated meal-count endpoint
              is available to the Mess In-charge role.
            </p>
          </div>
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function MessMealCountsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <MessMealCountsInner />
    </Suspense>
  );
}
