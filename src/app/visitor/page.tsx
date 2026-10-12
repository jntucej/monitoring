"use client";

import { Suspense, useCallback } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import {
  DoorOpen,
  Clock,
  ShieldCheck,
  Info,
  Ticket,
  AlertTriangle,
  Loader2,
  LogOut,
} from "lucide-react";

const MIN_TIER = 10; // visitor tier (lowest)

/* ── response shapes ── */

interface VisitorLogRow {
  id: string;
  user_id: string;
  check_in_at: string;
  check_out_at?: string | null;
  purpose?: string | null;
  status: string;
  person?: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    status?: string;
  } | null;
  host?: {
    id: string;
    name?: string;
  } | null;
}

interface VisitorsResponse {
  success: boolean;
  data: VisitorLogRow[];
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/* ── main content ── */

function VisitorDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "visitor") as Role;
  const tier = getRoleTier(role);

  // Visitor logs (active visitor passes). The route is operator/admin-scoped;
  // a visitor role will get a 403 — rendered as a graceful banner, not a crash.
  const {
    data: visitorData,
    loading,
    error,
    refresh,
  } = useApiResource<VisitorsResponse>("/api/visitors?status=active", {
    ttlMs: 30_000,
  });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const activeLogs = (visitorData?.data ?? []).filter(
    (l) => l.status === "active" && !l.check_out_at
  );
  // A visitor account's own log: match on user id if present in the list.
  const myLog = user ? activeLogs.find((l) => l.user_id === user.id) ?? activeLogs[0] : activeLogs[0];

  const passStatus = !visitorData ? "UNAVAILABLE" : activeLogs.length ? "ACTIVE" : "CHECKED OUT";

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 min-w-0">
      {/* Page toolbar — global DynamicHeader already renders the app header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <DoorOpen className="w-6 h-6 text-emerald-400" />
            Visitor Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier} ·{" "}
            {user?.name || "Campus Visitor"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={() => void refreshAll()}
            disabled={loading}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* error banner — visitor role is not in /api/visitors' allowlist; render gracefully */}
      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Pass status loading failed — the visitor log service is not reachable for your role
            ({error.split(":")[0]}). Contact the gate operator on duty for pass status.
          </span>
          <button
            onClick={() => void refresh()}
            className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-400">
            <Info className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Visit Status</span>
          </div>
          <p
            className={`text-xl font-bold ${
              passStatus === "ACTIVE"
                ? "text-emerald-400"
                : passStatus === "CHECKED OUT"
                  ? "text-sky-400"
                  : "text-slate-400"
            }`}
          >
            {passStatus}
          </p>
          <p className="text-xs text-slate-500">
            {passStatus === "ACTIVE"
              ? "Your visitor pass is active for today"
              : passStatus === "CHECKED OUT"
                ? "No active visitor pass on record"
                : "Pass status could not be verified"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-400">
            <Ticket className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">My Pass</span>
          </div>
          {myLog ? (
            <>
              <p className="text-lg font-bold text-white">
                {myLog.purpose || "General Visit"}
              </p>
              <p className="text-xs text-slate-500">
                Checked in {formatTime(myLog.check_in_at)}
                {myLog.host?.name ? ` · Host: ${myLog.host.name}` : ""}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-slate-500">—</p>
              <p className="text-xs text-slate-500">No pass detail available for your account</p>
            </>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-400">
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Check-Out</span>
          </div>
          <p className="text-xl font-bold text-sky-400">On Exit</p>
          <p className="text-xs text-slate-500">Scan your pass at any gate before leaving campus</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Campus Rules</span>
          </div>
          <p className="text-xl font-bold text-indigo-400">Comply</p>
          <p className="text-xs text-slate-500">Accompany your host while on premises</p>
        </div>
      </div>

      {/* pass history table */}
      <WidgetBoundary title="Visitor Pass Log">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              Visitor Pass Log
            </h2>
          </div>
          {loading ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading visitor log…
            </div>
          ) : !visitorData || visitorData.data.length === 0 ? (
            <div className="p-4">
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-6 text-center text-sm text-slate-500">
                No visitor log entries available.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Visitor</th>
                    <th className="text-left px-4 py-3">Host</th>
                    <th className="text-left px-4 py-3">Purpose</th>
                    <th className="text-left px-4 py-3">Checked In</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {visitorData.data.slice(0, 10).map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">
                        {l.person?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{l.host?.name || "—"}</td>
                      <td className="px-4 py-3 text-slate-400">{l.purpose || "—"}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {formatTime(l.check_in_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${
                            l.status === "active"
                              ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
                              : "text-slate-500 border-slate-600/30 bg-slate-500/10"
                          }`}
                        >
                          {l.status === "active" ? "Active" : "Completed"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <p className="text-sm text-slate-400 leading-relaxed">
        Need to extend your visit or have questions about campus access? Contact the
        gate operator on duty or the campus administration desk.
      </p>

      <DevContactStrip />
    </div>
  );
}

export default function VisitorDashboardPage() {
  return (
    <GuardedPage minTier={MIN_TIER} allowedRoles={["visitor", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <VisitorDashboardInner />
      </Suspense>
    </GuardedPage>
  );
}
