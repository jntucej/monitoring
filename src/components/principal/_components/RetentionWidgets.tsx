"use client";

/* ── Retention widget components for the principal console ──
   These widgets use explicit TONE_CLASS maps to avoid the
   bg-[var(--action-${tone})] Tailwind-var interpolation issue. */

import { useEffect, useState, memo } from "react";
import {
  Clock,
  TrendingUp,
  TrendingDown,
  UserCheck,
  Inbox,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Activity,
  CheckCircle2,
  XCircle,
  Zap,
} from "lucide-react";
import { cn, getTimeAgo } from "@/lib/utils";
import { fetchJson, type Resp } from "@/components/principal/_components/fetchJson";

/* ── TONE_CLASS maps — no dynamic Tailwind var interpolation ── */

const TONE_CLASS: Record<string, { bg: string; text: string; border: string }> = {
  neutral:  { bg: "bg-slate-500/10",  text: "text-slate-400",   border: "border-slate-500/30"  },
  positive: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  warning:  { bg: "bg-amber-500/10",  text: "text-amber-400",   border: "border-amber-500/30"  },
  critical: { bg: "bg-rose-500/10",   text: "text-rose-400",    border: "border-rose-500/30"   },
};

function toneClass(tone: string) {
  return TONE_CLASS[tone] ?? TONE_CLASS.neutral;
}

/* ── PrincipalStageTag ── */

export const PrincipalStageTag = memo(function PrincipalStageTag({
  stage,
}: {
  stage: string;
}) {
  const tone = stage.includes("overdue") ? "critical" : "warning";
  const tc = toneClass(tone);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border",
        tc.bg,
        tc.text,
        tc.border
      )}
    >
      <Clock className="h-3 w-3" />
      {stage.replace(/_/g, " ")}
    </span>
  );
});

/* ── PrincipalCatchUpCard ── */

export const PrincipalCatchUpCard = memo(function PrincipalCatchUpCard() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson("/api/principal/catch-up")
      .then((r) => {
        setData(r);
        setError(r.success ? null : r.error?.message ?? "Load failed");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Network error"))
      .finally(() => setLoading(false));
  }, []);

  const d = (data?.data as Record<string, unknown>) ?? null;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <Inbox className="h-4 w-4 text-indigo-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Since Last Visit
        </span>
      </div>
      {loading && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}
      {error && !loading && (
        <p className="text-xs text-rose-400">{error}</p>
      )}
      {d && !loading && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-400">{Number(d.approvalsCleared ?? 0)}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Cleared</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-amber-400">{Number(d.pendingSince ?? 0)}</p>
              <p className="text-[10px] text-[var(--text-muted)]">New Pending</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-rose-400">{Number(d.newEscalations ?? 0)}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Escalated</p>
            </div>
          </div>
          {(d.openAlerts as unknown[] | undefined)?.length ? (
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Open Alerts</p>
              <ul className="space-y-1.5">
                {(d.openAlerts as Array<Record<string, unknown>>).slice(0, 3).map((a, i) => {
                  const tone = a.severity === "critical" ? "critical" : a.severity === "high" ? "warning" : "neutral";
                  const tc = toneClass(tone);
                  return (
                    <li key={i} className={cn("rounded-lg p-2 flex items-center gap-2", tc.bg)}>
                      <AlertTriangle className={cn("h-3.5 w-3.5 shrink-0", tc.text)} />
                      <span className={cn("text-xs font-medium truncate", tc.text)}>
                        {String(a.title ?? a.id ?? "Alert")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
});

/* ── PrincipalAgingStrip ── */

export const PrincipalAgingStrip = memo(function PrincipalAgingStrip() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson("/api/principal/catch-up")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const d = (data?.data as Record<string, unknown>) ?? null;
  const quickWins = (d?.quickWins as Array<Record<string, unknown>>) ?? [];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-amber-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Aging Tickets — Quick Wins
        </span>
      </div>
      {loading && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}
      {!loading && quickWins.length === 0 && (
        <p className="text-sm text-[var(--text-muted)] py-2">No aging tickets to clear.</p>
      )}
      {!loading && quickWins.length > 0 && (
        <div className="space-y-2">
          {quickWins.map((r, i) => {
            const sla = r.sla_deadline ? new Date(String(r.sla_deadline)) : null;
            const isOverdue = sla && sla < new Date();
            const tone = isOverdue ? "critical" : "warning";
            const tc = toneClass(tone);
            return (
              <div key={i} className={cn("rounded-lg border p-3 flex items-center gap-3", tc.border)}>
                <div className={cn("flex-1 min-w-0")}>
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {String(r.ticket_number ?? "—")}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {String(r.workflow_type ?? "").replace(/_/g, " ")} ·{" "}
                    {sla ? getTimeAgo(sla.toISOString()) : "SLA pending"}
                  </p>
                </div>
                <PrincipalStageTag stage={isOverdue ? "overdue" : "due"} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

/* ── PrincipalQuickWins ── */

export const PrincipalQuickWins = memo(function PrincipalQuickWins() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson("/api/principal/catch-up")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const d = (data?.data as Record<string, unknown>) ?? null;
  const activeDelegations = (d?.activeDelegations as Array<Record<string, unknown>>) ?? [];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Delegations in Force
        </span>
      </div>
      {loading && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}
      {!loading && activeDelegations.length === 0 && (
        <p className="text-sm text-[var(--text-muted)] py-2">No active delegations.</p>
      )}
      {!loading && activeDelegations.length > 0 && (
        <ul className="space-y-2">
          {activeDelegations.map((r, i) => (
            <li key={i} className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-2.5 flex items-center gap-2">
              <UserCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="text-xs font-medium text-[var(--text-primary)] flex-1 truncate">
                {String(r.name ?? "rule")}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                → {String(r.delegate_role ?? "—")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

/* ── PrincipalWeekDigest ── */

export const PrincipalWeekDigest = memo(function PrincipalWeekDigest() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson("/api/principal/week-digest")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const d = (data?.data as Record<string, unknown>) ?? null;
  const totalPending = (d?.totalPending as number) ?? 0;
  const totalApproved = (d?.totalApproved as number) ?? 0;
  const totalEscalated = (d?.totalEscalated as number) ?? 0;
  const series = (d?.series as Array<{ label: string; count: number }>) ?? [];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-violet-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Week Digest
        </span>
      </div>
      {loading && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}
      {!loading && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-lg font-bold text-amber-400">{totalPending}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-400">{totalApproved}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Cleared</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-rose-400">{totalEscalated}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Escalated</p>
            </div>
          </div>
          {series.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Daily Activity</p>
              <div className="flex items-end gap-1 h-16">
                {series.map((s, i) => {
                  const max = Math.max(...series.map((x) => x.count), 1);
                  const h = Math.max((s.count / max) * 100, 8);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t bg-indigo-500/40"
                        style={{ height: `${h}%` }}
                        title={`${s.count} requests`}
                      />
                      <span className="text-[9px] text-[var(--text-muted)]">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/* ── PrincipalDelegationInForce ── */

export const PrincipalDelegationInForce = memo(function PrincipalDelegationInForce() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson("/api/principal/catch-up")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const d = (data?.data as Record<string, unknown>) ?? null;
  const activeDelegations = (d?.activeDelegations as Array<Record<string, unknown>>) ?? [];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-cyan-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Delegations Currently in Force
        </span>
      </div>
      {loading && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}
      {!loading && activeDelegations.length === 0 && (
        <p className="text-sm text-[var(--text-muted)] py-2">No delegations in force.</p>
      )}
      {!loading && activeDelegations.length > 0 && (
        <div className="space-y-2">
          {activeDelegations.map((r, i) => (
            <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-[var(--text-primary)] flex-1 truncate">
                  {String(r.name ?? "rule")}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {r.expires_at ? `expires ${String(r.expires_at).slice(0, 10)}` : "indefinite"}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                Scope: {String(r.scope ?? "—")} · Delegate: {String(r.delegate_role ?? "—")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

/* ── PrincipalSlaHeatmap ── */

export const PrincipalSlaHeatmap = memo(function PrincipalSlaHeatmap() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson("/api/principal/sla-heatmap")
      .then((r) => {
        setData(r);
        setError(r.success ? null : r.error?.message ?? "Load failed");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Network error"))
      .finally(() => setLoading(false));
  }, []);

  const d = (data?.data as Record<string, unknown>) ?? null;
  const cells = (d?.cells as Array<{ stage: string; total: number; withinSla: number; breached: number; rate: number }>) ?? [];

  function cellColor(rate: number): string {
    if (rate >= 90) return "bg-emerald-500/20 text-emerald-300";
    if (rate >= 60) return "bg-amber-500/20 text-amber-300";
    return "bg-rose-500/20 text-rose-300";
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-rose-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          SLA Heatmap
        </span>
      </div>
      {loading && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}
      {error && !loading && (
        <p className="text-xs text-rose-400">{error}</p>
      )}
      {!loading && !error && cells.length === 0 && (
        <p className="text-sm text-[var(--text-muted)] py-2">No SLA data.</p>
      )}
      {!loading && !error && cells.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {cells.map((c) => (
            <div
              key={c.stage}
              className={cn("rounded-lg p-3 text-center border border-transparent", cellColor(c.rate))}
            >
              <p className="text-lg font-bold">{c.rate}%</p>
              <p className="text-[10px] uppercase tracking-wide">
                {c.stage.replace(/_/g, " ")}
              </p>
              <p className="text-[9px] text-[var(--text-muted)]">
                {c.total} tickets · {c.breached} breached
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
