"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { MiniStat } from "./MiniStat";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";

interface VPHistoryResponse {
  success?: boolean;
  data: {
    totals: { approved: number; rejected: number; forwarded: number; escalated: number };
    decisions: Array<{
      ticket: string;
      outcome: string;
      student: string;
      reason: string;
      decidedAt: string;
      href: string;
    }>;
    chart: Array<{ date: string; approved: number; rejected: number }>;
  };
}

export function HistoryView({
  days,
  title,
}: {
  days: 7 | 30 | 90;
  title: string;
}) {
  const { data, loading } = useApiResource<VPHistoryResponse>(`/api/vp/history?range=${days}d`, {
    ttlMs: 60_000,
  });

  const d = data?.data;

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h1>
        <p className="text-xs text-[var(--text-muted)]">Decision outcomes over the last {days} days</p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat label="Approved" value={d?.totals.approved} tone="ok" />
        <MiniStat label="Rejected" value={d?.totals.rejected} tone="danger" />
        <MiniStat label="Forwarded" value={d?.totals.forwarded} tone="info" />
        <MiniStat label="Escalated" value={d?.totals.escalated} tone="warn" />
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
        <h2 className="mb-3 text-sm font-semibold">Decisions over time</h2>
        <div className="h-52 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d?.chart ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="approved" stackId="a" fill="var(--action-primary)" />
              <Bar dataKey="rejected" stackId="a" fill="var(--action-danger)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]">
        <header className="border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold">Decision history</h2>
        </header>
        {loading && !d ? (
          <div className="p-4">
            <ListSkeleton rows={5} />
          </div>
        ) : (d?.decisions ?? []).length === 0 ? (
          <div className="p-6">
            <EmptyState title="No decisions in this range" />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {d!.decisions.map((dec) => (
              <li key={dec.ticket} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    dec.outcome === "APPROVED"
                      ? "bg-[var(--action-primary)]/10 text-[var(--action-primary)]"
                      : "bg-[var(--action-danger)]/10 text-[var(--action-danger)]"
                  }`}
                >
                  {dec.outcome}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[var(--text-primary)]">
                    {dec.student} · {dec.ticket}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">{dec.reason}</p>
                </div>
                <span className="hidden text-[11px] text-[var(--text-muted)] sm:inline">
                  {dec.decidedAt}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
