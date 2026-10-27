"use client";

import { Suspense } from "react";
import Link from "next/link";
import { PageLoading } from "@/components/shared/LoadingStates";
import { ActivePasses } from "@/components/student/ActivePasses";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { FileCheck, Send, Calendar, Clock } from "lucide-react";

function StudentGatePassInner() {
  return (
    <div className="space-y-6 px-4 py-6 md:px-6 min-w-0">
      <div className="flex items-center gap-2">
        <FileCheck className="w-5 h-5 text-[var(--action-primary)]" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Gate Pass Requests</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/student/passes?action=new"
          className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 transition-all flex items-center gap-2.5"
        >
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
            <Send className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--text-primary)]">Request Local Pass</div>
            <div className="text-[10px] text-[var(--text-muted)]">Day outing up to 21:00</div>
          </div>
        </Link>
        <Link
          href="/student/passes?action=new_leave"
          className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-all flex items-center gap-2.5"
        >
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--text-primary)]">Outstation Leave</div>
            <div className="text-[10px] text-[var(--text-muted)]">Multi-day home permissions</div>
          </div>
        </Link>
        <Link
          href="/student/passes?action=new"
          className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-all flex items-center gap-2.5"
        >
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--text-primary)]">Daily Outing</div>
            <div className="text-[10px] text-[var(--text-muted)]">Short outing (2-4 hrs)</div>
          </div>
        </Link>
      </div>

      <ActivePasses />
      <DevContactStrip />
    </div>
  );
}

export default function StudentGatePassPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StudentGatePassInner />
    </Suspense>
  );
}
