"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { SecurityManagement } from "@/components/sysadmin/SecurityManagement";
import { ShieldCheck, KeyRound, Landmark, Lock, ArrowUpRight, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface SecHealth {
  services?: Record<string, unknown>;
  redis?: { status: string };
  status?: string;
}

function SecurityReinforcedInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "sysadmin") as Role;

  const { data, loading, error, refresh } = useApiResource<
    { success: boolean; data: SecHealth }
  >("/api/sysadmin/services", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;

  const linkCard = (href: string, Icon: React.ComponentType<{ className?: string }>, title: string, sub: string) => (
    <Link
      href={href}
      className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 min-w-0 hover:bg-slate-800/50 transition-colors group"
    >
      <div className="flex items-center gap-2 text-slate-400 min-w-0">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide truncate">{title}</span>
        <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-slate-600 group-hover:text-sky-400 transition-colors" />
      </div>
      <p className="mt-2 text-xs text-slate-500">{sub}</p>
    </Link>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 min-w-0">
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">Infrastructure Security</p>
        <p className="text-xs text-[var(--text-secondary)]">
          Zero-trust posture: IP allowlists, session &amp; key management, SSO
          configuration. Signed in as <span className="font-mono text-slate-300">{role}</span>.
        </p>
      </div>

      {/* Quick summary cards → link into the deep sub-pages */}
      <WidgetBoundary title="Security Scope Summary">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          {linkCard("/sysadmin/sessions", Lock, "Active Sessions", "Live JWT user sessions & revocation")}
          {linkCard("/sysadmin/sso", Landmark, "SSO", "Federated sign-in provider configuration")}
          {linkCard("/sysadmin/access-keys", KeyRound, "Access Keys", "API / machine access keys")}
          {linkCard("/sysadmin/security", ShieldCheck, "Zero-Trust", "IP allowlists & access controls")}
        </div>
      </WidgetBoundary>

      {/* Live services snapshot */}
      <WidgetBoundary title="Security-Related Service State">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-white">Trust Layer Services</span>
          </div>
          {busy ? (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-800/40" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 min-w-0">
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                <p className="text-xs text-slate-500 uppercase">Overall</p>
                <p className={`mt-1 text-sm font-bold ${(data as { success: boolean; data: SecHealth } | null)?.data?.status === "healthy" ? "text-emerald-400" : "text-amber-400"}`}>
                  {(data as { success: boolean; data: SecHealth } | null)?.data?.status ?? "unknown"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                <p className="text-xs text-slate-500 uppercase">Cache (redis)</p>
                <p className={`mt-1 text-sm font-bold ${(data as { success: boolean; data: SecHealth } | null)?.data?.redis?.status === "healthy" ? "text-emerald-400" : "text-amber-400"}`}>
                  {(data as { success: boolean; data: SecHealth } | null)?.data?.redis?.status ?? "unknown"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                <p className="text-xs text-slate-500 uppercase">Auth Service</p>
                <p className="mt-1 text-sm font-bold text-slate-200">
                  {((data as { success: boolean; data: SecHealth } | null)?.data?.services?.auth as Record<string, string> | undefined)?.status ?? "n/a"}
                </p>
              </div>
            </div>
          )}
        </div>
      </WidgetBoundary>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Security state unavailable: {error}</span>
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

      {/* Existing full security management component */}
      <SecurityManagement />

      <DevContactStrip />
    </div>
  );
}

export default function SecurityPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <Suspense fallback={<PageLoading />}>
        <SecurityReinforcedInner />
      </Suspense>
    </AuthGuard>
  );
}
