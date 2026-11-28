"use client";

import { useMemo } from "react";
import { TrendingUp, BarChart2 } from "lucide-react";

export interface MarkItem {
  subject: string | null;
  examType: string;
  score: number | null;
  maxMarks: number;
}

interface InternalMarksTrendChartProps {
  marks: MarkItem[];
}

export function InternalMarksTrendChart({ marks }: InternalMarksTrendChartProps) {
  const chartData = useMemo(() => {
    return marks
      .filter((m) => m.score !== null && m.maxMarks > 0)
      .map((m) => {
        const pct = Math.round(((m.score ?? 0) / m.maxMarks) * 100);
        return {
          label: m.subject || m.examType,
          score: m.score,
          max: m.maxMarks,
          pct,
        };
      });
  }, [marks]);

  if (chartData.length === 0) {
    return (
      <div className="surface-card bg-bg-surface p-4 rounded-xl border border-border">
        <div className="flex items-center gap-2 mb-2">
          <BarChart2 className="w-4 h-4 text-action-primary" />
          <h3 className="text-sm font-semibold text-text-primary">
            Internal Marks Trend
          </h3>
        </div>
        <p className="text-xs text-text-muted">
          No published internal marks recorded yet for this semester.
        </p>
      </div>
    );
  }

  const avgPct = Math.round(
    chartData.reduce((acc, c) => acc + c.pct, 0) / chartData.length
  );

  return (
    <div className="surface-card bg-bg-surface p-4 rounded-xl border border-border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-action-primary" />
          <h3 className="text-sm font-semibold text-text-primary">
            Internal Marks Trend
          </h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <TrendingUp className="w-3.5 h-3.5 text-action-success" />
          <span>Cohort Avg: <strong className="text-text-primary font-mono tabular-nums">{avgPct}%</strong></span>
        </div>
      </div>

      <div className="space-y-2.5 pt-1">
        {chartData.map((item, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between items-baseline text-xs">
              <span className="font-semibold text-text-primary truncate max-w-[200px]">
                {item.label}
              </span>
              <span className="font-mono tabular-nums text-text-muted text-[11px]">
                {item.score}/{item.max} ({item.pct}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-bg-elevated overflow-hidden flex">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  item.pct >= 75
                    ? "bg-emerald-500"
                    : item.pct >= 50
                    ? "bg-blue-500"
                    : "bg-rose-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, item.pct))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default InternalMarksTrendChart;
