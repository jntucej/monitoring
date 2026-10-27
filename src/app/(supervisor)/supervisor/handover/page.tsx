"use client";

import { Suspense } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { ScrollText, Lock, ArrowRight } from "lucide-react";

function SupervisorHandoverInner() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Shift Handover">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="space-y-3 min-w-0">
            <div className="p-6 text-center min-w-0">
              <Lock className="w-5 h-5 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Shift handover log is not exposed at this tier. There is no dedicated
                handover-log source for the supervisor desk.
              </p>
            </div>
            <div className="flex justify-end">
              <a
                href="/supervisor/approvals"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
              >
                Open approvals desk <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function SupervisorHandoverPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SupervisorHandoverInner />
    </Suspense>
  );
}
