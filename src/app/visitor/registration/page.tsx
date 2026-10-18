"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import { Inbox, Loader2, UserCheck, ShieldCheck, AlertTriangle, ArrowRight } from "lucide-react";

/* response shapes */

interface RegistrationSlice {
  name: string | null;
  uniqueId: string | null;
  role: string | null;
  status: string | null;
}

interface HostSlice {
  name: string | null;
  uniqueId: string | null;
  role: string | null;
}

interface ApprovalSlice {
  state: "ACTIVE" | "COMPLETED" | "NONE";
  checkedInAt: string | null;
  checkedOutAt?: string | null;
  purpose: string | null;
}

interface VisitorsMineResponse {
  success: boolean;
  data: {
    logs: unknown[];
    active: { status: string; log: unknown } | null;
    lastCompleted: unknown | null;
    registration: RegistrationSlice;
    hostInfo: HostSlice;
    approvalStatus: ApprovalSlice;
    checkInOut: { checkedInAt: string | null; checkedOutAt: string | null; durationMinutes: number | null };
    visitDetails: { purpose: string | null; hostName: string | null; checkedInAt: string | null; checkedOutAt: string | null; status: string | null };
    request: { requestedAt: string | null; purpose: string | null; hostName: string | null; state: string };
    history: unknown[];
  };
}

function VisitorRegistrationInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "visitor") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<VisitorsMineResponse>("/api/visitors/mine", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const reg = data?.data?.registration;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link */}
      <Link
        href="/visitor"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Visitor Portal
      </Link>

      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-white">Registration</h1>
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Registration data unavailable: {error}</span>
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <WidgetBoundary title="Registration">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">Your registration</span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {data?.data?.logs?.length ?? 0} visit(s) on record
            </span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading registration…
            </div>
          ) : (
            <div className="p-4 min-w-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Name</p>
                  <p className="mt-1 text-base font-semibold text-slate-100">
                    {reg?.name ?? (user?.name ?? "—")}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Visitor ID</p>
                  <p className="mt-1 text-base font-mono text-sky-400">
                    {reg?.uniqueId ?? (user?.id?.slice(0, 8) ?? "—")}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Account</p>
                  <p className="mt-1 text-base font-bold text-emerald-400">{reg?.status ?? "—"}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Role</p>
                  <p className="mt-1 text-base font-bold text-amber-400">{reg?.role ?? "visitor"}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Your registration is linked to {user?.email ?? "your account"}. Contact your host
                or the campus security desk if your visitor ID is missing or incorrect.
              </p>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function VisitorRegistrationPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VisitorRegistrationInner />
    </Suspense>
  );
}
