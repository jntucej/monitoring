"use client";

import { Suspense } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { FileText, Lock, ArrowRight } from "lucide-react";

function SupervisorReportsInner() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Security Reports">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="space-y-3 min-w-0">
            <div className="p-6 text-center min-w-0">
              <Lock className="w-5 h-5 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Security reports are not exposed at this tier. No report-generation source is
                available to the supervisor desk.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 text-xs text-slate-400 min-w-0">
              <p className="text-slate-300 font-medium mb-1.5">Authority</p>
              <p>
                Supervisor manages assigned security operations. Restrict gate assignments and
                sensitive identity information according to duty.
              </p>
            </div>
            <a
              href="/supervisor/approvals"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
            >
              Review pending approvals <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function SupervisorReportsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SupervisorReportsInner />
    </Suspense>
  );
}
