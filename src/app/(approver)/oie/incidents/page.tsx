"use client";

import { Suspense } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import Link from "next/link";
import { ArrowRight, BellOff, Lock } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";

function OieIncidentsInner() {
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

      <WidgetBoundary title="Exceptions and Incidents">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <BellOff className="w-4 h-4 text-amber-400/70 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">
              OIE-Flagged Exceptions
            </span>
          </div>
          <div className="p-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <Lock className="w-5 h-5 text-slate-600" />
              <p className="text-sm text-slate-500 max-w-md">
                Incident and alert feeds are admin-scoped and not available at this tier. The only
                exception OIE can act on is SLA breach in its own queue — flagged on the Overview
                and Records tabs.
              </p>
            </div>
          </div>
        </div>
      </WidgetBoundary>
    </div>
  );
}
export default function OieIncidentsPage() {
  return (
    <AuthGuard allowedRoles={['oie', 'exam_branch', 'exam_superintendent', 'vice_principal', 'principal', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <OieIncidentsInner />
      </Suspense>
    </AuthGuard>
  );
}
