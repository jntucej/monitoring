"use client";

import { Suspense } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { Users, Clock, KeyRound, ShieldCheck, AlertTriangle } from "lucide-react";

const MIN_TIER = 45; // staff tier
const API_URL = "/api/admin/security/stats";

interface SecurityStatsData {
  failedLogins24h: number;
  activeSessions: number;
  forced2FA: boolean;
  ipAllowlistEnabled: boolean;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-[var(--text-primary)]",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | boolean;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[var(--text-muted)]">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${accent}`}>{typeof value === "boolean" ? (value ? "ON" : "OFF") : value}</p>
      {sub && <p className="text-xs text-[var(--text-muted)]">{sub}</p>}
    </div>
  );
}

function StaffDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "staff") as Role;
  const tier = getRoleTier(role);

  const { data, loading, error, refresh } = useApiResource<SecurityStatsData>(API_URL, {
    ttlMs: 10_000,
  });

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const s = data;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Signed in as <span className="font-mono">{role}</span> · tier {tier} · {user?.name || "Campus Staff"}
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--bg-elevated)] disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Data fetch failed: {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          label="Active Sessions"
          value={s?.activeSessions ?? "…"}
          sub="Concurrent live sessions system-wide"
          accent="text-sky-400"
        />
        <StatCard
          icon={KeyRound}
          label="2FA Enforcement"
          value={s?.forced2FA ?? false}
          sub="MFA enforced on privileged accounts"
          accent={s?.forced2FA ? "text-emerald-400" : "text-amber-400"}
        />
        <StatCard
          icon={Clock}
          label="Failed Logins (24h)"
          value={s?.failedLogins24h ?? "…"}
          sub="Unsuccessful login attempts in last 24 hours"
          accent={(s?.failedLogins24h ?? 0) > 10 ? "text-rose-400" : "text-emerald-400"}
        />
      </div>

      <WidgetBoundary title="Role Alerts">
        <div className="text-sm text-[var(--text-muted)]">
          Staff-scoped alerts will surface here when triggered.
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function StaffDashboardPage() {
  return (
    <GuardedPage minTier={MIN_TIER}>
      <Suspense fallback={<PageLoading />}>
        <StaffDashboardInner />
      </Suspense>
    </GuardedPage>
  );
}
