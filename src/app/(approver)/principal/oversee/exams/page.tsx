"use client";

import { Suspense } from "react";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { GraduationCap, CheckCircle, Clock } from "lucide-react";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import { usePolling } from "@/hooks/usePolling";
import { useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface ExamAccessRow {
  id: string;
  ticket_number: string;
  current_stage: string;
  status: string;
  sla_deadline: string | null;
  candidate_name: string | null;
  candidate_unique_id: string | null;
  roll: string | null;
}

interface StageSummary {
  current_stage: string;
  status: string;
  count: number;
}

function ExamsInner() {
  const [authorised, setAuthorised] = useState<ExamAccessRow[] | null>(null);
  const [stageSummary, setStageSummary] = useState<StageSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/exam/access?limit=50");
      const json = await res.json();
      if (json.success) {
        setAuthorised(json.data?.authorised ?? []);
        setStageSummary(json.data?.stageSummary ?? []);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  usePolling(load, { intervalMs: 60_000 });

  return (
    <PrincipalWidgetBoundary title="Exam Access Oversight">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <GraduationCap className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">Exam Access</span>
        </div>

        {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}

        {/* Stage summary chips */}
        {stageSummary.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {stageSummary.slice(0, 6).map((s) => (
              <span
                key={`${s.current_stage}-${s.status}`}
                className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-[var(--bg-elevated)] border border-[var(--border)]"
              >
                {s.current_stage.replace(/_/g, " ")} · {s.status} ({s.count})
              </span>
            ))}
          </div>
        )}

        {!authorised && !error ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : authorised && authorised.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-3 text-center">No exam access requests.</p>
        ) : (
          <ul className="space-y-2">
            {authorised?.slice(0, 15).map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-xs min-w-0"
              >
                {a.status === "APPROVED" ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span className="font-mono text-[var(--text-primary)] shrink-0">{a.ticket_number}</span>
                <span className="text-[var(--text-primary)] truncate flex-1">
                  {a.candidate_name || "—"}
                  {a.roll && <span className="text-[var(--text-muted)] ml-1">({a.roll})</span>}
                </span>
                <span className="text-[var(--text-muted)] capitalize shrink-0">
                  {a.current_stage?.replace(/_/g, " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PrincipalWidgetBoundary>
  );
}

export default function ExamsPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <div className="px-4 sm:px-6 py-6 space-y-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Examination Oversight</h1>
        <ExamsInner />
      </div>
    </Suspense>
  );
}
