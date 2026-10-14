"use client";

import { Suspense } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";

function OieApprovalsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "oie") as Role;
  const tier = getRoleTier(role);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link */}
      <Link
        href="/oie"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Overview
      </Link>

      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      <WidgetBoundary title="Reports and Approvals">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-sm font-semibold text-white">OIE Approvals Desk</span>
              </div>
              <p className="text-sm text-slate-300">
                OIE approval actions — approve, forward or reject with remarks — run from the
                examination approvals desk.
              </p>
              <p className="mt-2 text-xs text-slate-500 min-w-0">
                OIE is restricted to the actual duties assigned to OIE; examination marks and
                confidential results are not exposed by viewing attendance.
              </p>
            </div>
            <a
              href="/exam/permissions"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
            >
              Exam Approvals Desk <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </WidgetBoundary>
    </div>
  );
}
export default function OieApprovalsPage() {
  return (
    <AuthGuard allowedRoles={['oie', 'exam_branch', 'exam_superintendent', 'vice_principal', 'principal', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <OieApprovalsInner />
      </Suspense>
    </AuthGuard>
  );
}
