"use client";

import { Suspense, useCallback, useMemo } from "react";
import Link from "next/link";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import {
  Scan,
  ListOrdered,
  BadgeCheck,
  KeyRound,
  Flag,
  DoorOpen,
  Loader2,
  ArrowRight,
} from "lucide-react";
import {
  useApiResource,
  clearCache,
} from "@/hooks/useApiResource";

/* ── response shapes ── */

interface TransactionsResponse {
  success: boolean;
  data: {
    transactions: unknown[];
    counts: {
      total: number;
      entries: number;
      exits: number;
      manual: number;
      flagged: number;
    };
    gateScoped: boolean;
    gateId: string | null;
  };
}

interface GatesResponse {
  success: boolean;
  data: Array<{ id: string; name: string; gate_code?: string; is_active?: boolean }>;
}

interface PermissionsResponse {
  success: boolean;
  data: unknown[];
  total?: number;
}

function OperatorOverviewInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "operator") as Role;
  const tier = getRoleTier(role);

  const transactionsUrl = "/api/operator/transactions";
  const gatesUrl = user?.gateId ? null : "/api/gates";
  const permissionsUrl =
    user?.role === "operator"
      ? "/api/permissions?status=PENDING&stage=main_gate"
      : user?.gateId
        ? null
        : "/api/permissions?status=PENDING";

  const {
    data: transactions,
    loading: txLoading,
    refresh: refreshTransactions,
  } = useApiResource<TransactionsResponse>(transactionsUrl, {
    ttlMs: 30_000,
  });

  const {
    data: gates,
    loading: gatesLoading,
    refresh: refreshGates,
  } = useApiResource<GatesResponse>(gatesUrl, {
    ttlMs: 60_000,
  });

  const {
    data: permissions,
    loading: permsLoading,
    refresh: refreshPermissions,
  } = useApiResource<PermissionsResponse>(permissionsUrl, {
    ttlMs: 30_000,
  });

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([refreshTransactions(), refreshGates(), refreshPermissions()]);
  }, [refreshTransactions, refreshGates, refreshPermissions]);

  // Visibility-aware polling — no leaked intervals, no background churn.
  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const counts = transactions?.data?.counts;
  const gateId = user?.gateId;
  const activeGates = useMemo(() => {
    if (gateId) {
      // Operator is scoped to a single gate.
      return [{ id: gateId, name: gateId, gate_code: undefined, is_active: true }];
    }
    return (gates?.data ?? []).filter((g) => g.is_active !== false);
  }, [gates, gateId]);

  const queueTotal = permissions?.total ?? 0;
  const queueBusy =
    (permsLoading && !permissions && !user?.gateId) ||
    (user?.role === "operator" && permsLoading && !permissions);

  const busy = txLoading && !transactions;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 min-w-0">
      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-[var(--text-muted)]">
            Signed in as <span className="font-mono">{role}</span> · tier {tier}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshAll()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] disabled:opacity-50 self-start sm:self-auto"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
          ) : null}
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* KPI row */}
      <WidgetBoundary title="Today at a Glance">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 min-w-0">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 min-w-0">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <ListOrdered className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide truncate">
                Today&rsquo;s Scans
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {busy ? "—" : (counts?.total ?? 0)}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {counts ? `${counts.entries} in · ${counts.exits} out` : "Loading…"}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 min-w-0">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <BadgeCheck className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide truncate">
                Verification Queue
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {queueBusy ? "—" : queueTotal}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Pending {user?.role === "operator" ? "gate passes" : "permissions"} to verify
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 min-w-0">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <Flag className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide truncate">
                Exceptions
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-400 tabular-nums">
              {busy ? "—" : (counts?.flagged ?? 0)}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Flagged / denied today</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 min-w-0">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <DoorOpen className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide truncate">
                Active Gates
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-400 tabular-nums">
              {user?.gateId ? 1 : gatesLoading && !gates ? "—" : activeGates.length}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {user?.gateId ? "Your assigned gate" : "Campus-wide"}
            </p>
          </div>
        </div>
      </WidgetBoundary>

      {/* Section links */}
      <WidgetBoundary title="Work Sections">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
          {[
            {
              href: "/operator/scan",
              label: "Gate Scanner",
              desc: "Open the live scan desk for your gate",
              icon: Scan,
              accent: "text-emerald-400",
            },
            {
              href: "/operator/transactions",
              label: "Today's Transactions",
              desc: "Movement log and counts for the gate",
              icon: ListOrdered,
              accent: "text-sky-400",
            },
            {
              href: "/operator/pass-verification",
              label: "Pass Verification",
              desc: "Approve or reject pending gate passes",
              icon: BadgeCheck,
              accent: "text-amber-400",
            },
            {
              href: "/operator/manual-entry",
              label: "Manual Entry",
              desc: "Verify a person by name / roll number",
              icon: KeyRound,
              accent: "text-violet-400",
            },
            {
              href: "/operator/exceptions",
              label: "Exceptions",
              desc: "Flagged and denied entries today",
              icon: Flag,
              accent: "text-rose-400",
            },
          ].map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.href}
                href={section.href}
                className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 hover:border-[var(--action-primary)]/40 hover:bg-[var(--bg-surface)] transition-colors min-w-0"
              >
                <span className={`${section.accent} shrink-0`}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-[var(--text-primary)]">
                    {section.label}
                  </span>
                  <span className="block text-xs text-[var(--text-muted)] truncate">
                    {section.desc}
                  </span>
                </span>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--action-primary)] transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      </WidgetBoundary>

      {/* Contact the developer (all roles) */}
      <DevContactStrip />
    </div>
  );
}

export default function OperatorDashboardPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <OperatorOverviewInner />
    </Suspense>
  );
}
