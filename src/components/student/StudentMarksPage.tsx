"use client";

import { useEffect, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Loader2, GraduationCap, Inbox } from "lucide-react";

interface GradeCard {
  subject: string | null;
  examType: string;
  academicYear: number;
  term: string | null;
  maxMarks: number;
  score: number | null;
  publishedAt: string | null;
}

export function StudentMarksPage() {
  const [cards, setCards] = useState<GradeCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/student/marks", { credentials: "include" });
        const json = await res.json();
        if (json.success && json.data) {
          setCards(json.data.gradeCard ?? []);
        } else {
          setError(json.error?.message ?? "Failed to load marks");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load marks");
      }
    })();
  }, []);

  // Group by (year, term) for a readable grade card.
  const grouped = new Map<string, GradeCard[]>();
  for (const c of cards ?? []) {
    const key = `${c.academicYear}${c.term ? " · " + c.term : ""}`;
    grouped.set(key, [...(grouped.get(key) ?? []), c]);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Marks</h1>
        <p className="text-sm text-text-muted">Published results only. Drafts are not shown until released.</p>
      </div>

      {error && <div className="surface-card bg-rose-500/10 p-3 text-sm text-action-danger">{error}</div>}

      {cards === null && !error && (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your grade card…
        </div>
      )}

      {cards?.length === 0 && (
        <div className="surface-card p-8 text-center">
          <Inbox className="w-6 h-6 text-text-muted mx-auto mb-2" />
          <p className="text-sm text-text-muted">No published marks yet.</p>
        </div>
      )}

      {[...grouped.entries()].map(([label, rows]) => (
        <WidgetBoundary key={label} name={`marks-${label}`} title={`Grade card — ${label}`}>
          <div className="surface-card overflow-hidden min-w-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted text-xs uppercase tracking-wide border-b border-border">
                  <th className="text-left px-3 py-2">Subject</th>
                  <th className="text-left px-3 py-2">Exam</th>
                  <th className="text-right px-3 py-2">Score</th>
                  <th className="text-right px-3 py-2">Max</th>
                  <th className="text-right px-3 py-2">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rows.map((r, i) => {
                  const pct = r.score !== null && r.maxMarks > 0 ? Math.round((r.score / r.maxMarks) * 100) : null;
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2 text-text-secondary">{r.subject ?? "—"}</td>
                      <td className="px-3 py-2 text-text-muted">{r.examType}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {r.score === null ? "—" : r.score}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-text-muted">{r.maxMarks}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-semibold ${
                        pct === null ? "text-text-muted" : pct >= 40 ? "text-action-success" : "text-action-danger"
                      }`}>
                        {pct === null ? "—" : `${pct}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </WidgetBoundary>
      ))}
    </div>
  );
}

export default StudentMarksPage;

