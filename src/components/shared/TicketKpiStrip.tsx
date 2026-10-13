"use client";
// src/components/shared/TicketKpiStrip.tsx
// SCAFFOLD:TICKETS — KPI row for the My Tickets dashboard. Idempotent.

import { Clock, CheckCircle2, XCircle, FileText, Loader2 } from "lucide-react";

export interface TicketCounts {
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  cancelled: number;
  total: number;
}

export interface TicketKpiStripProps {
  counts: TicketCounts | null;
  loading?: boolean;
}

export function TicketKpiStrip({ counts, loading }: TicketKpiStripProps) {
  const items = [
    { label: "Pending",   value: counts?.pending   ?? 0, icon: Clock,         tint: "text-amber-500"   },
    { label: "Approved",  value: counts?.approved  ?? 0, icon: CheckCircle2,  tint: "text-emerald-500" },
    { label: "Rejected",  value: counts?.rejected  ?? 0, icon: XCircle,       tint: "text-rose-500"    },
    { label: "Completed", value: counts?.completed ?? 0, icon: FileText,      tint: "text-sky-500"     },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3"
        >
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            {loading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <it.icon className={`h-3.5 w-3.5 ${it.tint}`} />}
            {it.label}
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{it.value}</div>
        </div>
      ))}
    </div>
  );
}
