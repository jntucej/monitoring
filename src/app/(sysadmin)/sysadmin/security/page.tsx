"use client";

<<<<<<< HEAD
export const dynamic = "force-dynamic";

import React from "react";
=======
import { Suspense, useCallback } from "react";
import Link from "next/link";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
import { AuthGuard } from "@/components/shared/AuthGuard";
import { SecurityManagement } from "@/components/sysadmin/SecurityManagement";
import {
  ShieldCheck,
  KeyRound,
  Landmark,
  Lock,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";

interface SecHealth {
  status?: string;
  redis?: { status: string };
  database?: { status: string; latencyMs?: number };
  gateways?: { status: string; online?: number; offline?: number; total?: number };
}

const QUICK_LINKS: Array<{
  href: string;
  Icon: typeof ShieldCheck;
  title: string;
  sub: string;
}> = [
  {
    href: "/sysadmin/roles",
    Icon: ShieldCheck,
    title: "Roles & Permissions",
    sub: "Role registry, hierarchy graph, and page-access matrix",
  },
  {
    href: "/sysadmin/access-keys",
    Icon: KeyRound,
    title: "Access Keys",
    sub: "One-time enrollment codes for students, parents and staff",
  },
  {
    href: "/sysadmin/sso",
    Icon: Landmark,
    title: "Single Sign-On",
    sub: "SAML / OAuth2 identity providers and domain filters",
  },
  {
    href: "/sysadmin/sessions",
    Icon: Lock,
    title: "Active Sessions",
    sub: "Live bearer tokens, revoke-by-device, global sign-out",
  },
];

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
  const posture = (data as { success: boolean; data: SecHealth } | null)?.data;

  const statusClass = (s?: string) =>
    s === "healthy"
      ? "bg-emerald-500/20 text-emerald-400"
      : s === "degraded"
        ? "bg-amber-500/20 text-amber-400"
        : s === "unhealthy"
          ? "bg-rose-500/20 text-rose-400"
          : "bg-slate-700/40 text-slate-400";

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 min-w-0">
      <PageHeader
        title="Infrastructure Security"
        subtitle="Zero-trust posture: identity, keys, SSO, sessions and service health"
        onRefresh={refreshAll}
        refreshing={loading && data != null}
      />

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Posture data unavailable: {error}
        </div>
      )}

      <WidgetBoundary title="Security Posture">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Live posture
              </span>
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">
              signed in as <span className="font-mono text-[var(--text-secondary)]">{role}</span>
            </span>
          </div>

          {busy ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg bg-[var(--bg-elevated)] animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-0">
              <div className="rounded-lg bg-[var(--bg-elevated)] p-3 min-w-0">
                <p className="text-[10px] uppercase text-[var(--text-muted)]">Overall</p>
                <p className="mt-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusClass(posture?.status)}`}>
                    {posture?.status ?? "unknown"}
                  </span>
                </p>
              </div>
              <div className="rounded-lg bg-[var(--bg-elevated)] p-3 min-w-0">
                <p className="text-[10px] uppercase text-[var(--text-muted)]">Redis</p>
                <p className="mt-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusClass(posture?.redis?.status)}`}>
                    {posture?.redis?.status ?? "unknown"}
                  </span>
                </p>
              </div>
              <div className="rounded-lg bg-[var(--bg-elevated)] p-3 min-w-0">
                <p className="text-[10px] uppercase text-[var(--text-muted)]">Database</p>
                <p className="mt-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusClass(posture?.database?.status)}`}>
                    {posture?.database?.status ?? "unknown"}
                  </span>
                </p>
                {typeof posture?.database?.latencyMs === "number" && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 tabular-nums">
                    {posture.database.latencyMs} ms
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-[var(--bg-elevated)] p-3 min-w-0">
                <p className="text-[10px] uppercase text-[var(--text-muted)]">Gateways</p>
                <p className="mt-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusClass(posture?.gateways?.status)}`}>
                    {posture?.gateways?.status ?? "unknown"}
                  </span>
                </p>
                {typeof posture?.gateways?.online === "number" && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 tabular-nums">
                    {posture.gateways.online} online · {posture.gateways.offline ?? 0} offline
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <WidgetBoundary title="Security tools">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
          {QUICK_LINKS.map(({ href, Icon, title, sub }) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 min-w-0 hover:bg-[var(--bg-elevated)] transition-colors group"
            >
              <div className="flex items-center gap-2 text-[var(--text-secondary)] min-w-0">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wide truncate">
                  {title}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-[var(--text-muted)] group-hover:text-[var(--action-primary)] transition-colors" />
              </div>
              <p className="mt-2 text-xs text-[var(--text-muted)]">{sub}</p>
            </Link>
          ))}
        </div>
      </WidgetBoundary>

      <WidgetBoundary title="Security operations">
        <SecurityManagement />
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function SysadminSecurityPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin"]}>
<<<<<<< HEAD
      <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">Zero-Trust & Security Hardening</p>
          <p className="text-xs text-[var(--text-secondary)]">
            Manage IP allowlists, mandatory 2FA enforcement, and active JWT user sessions.
          </p>
        </div>
        <SecurityManagement />
      </div>
=======
      <Suspense fallback={<PageLoading />}>
        <SecurityReinforcedInner />
      </Suspense>
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
    </AuthGuard>
  );
}
