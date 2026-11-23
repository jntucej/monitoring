"use client";

import { useEffect, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Loader2, GraduationCap, Inbox } from "lucide-react";
import {
  useEntityInspector,
  EntityInspectorPanel,
} from "@/components/shared/useEntityInspector";
import {
  KVPairs,
  ActionRow,
  InspectorButton,
  type EntityInspection,
} from "@/components/shared/EntityInspector";

interface GradeCard {
  subject: string | null;
  examType: string;
  academicYear: number;
  term: string | null;
  maxMarks: number;
  score: number | null;
  publishedAt: string | null;
}

function StatusBadge({ text, tone }: { text: string; tone?: "ok" | "warn" | "danger" | "neutral" }) {
  const cls: Record<string, string> = {
    ok: "bg-emerald-500/10 text-action-success border border-emerald-500/20",
    warn: "bg-amber-500/10 text-action-warning border border-amber-500/20",
    danger: "bg-rose-500/10 text-action-danger border border-rose-500/20",
    neutral: "bg-bg-elevated text-text-muted border border-border",
  };
  const t = tone ?? "neutral";
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${cls[t]}`}>
      {text}
    </span>
  );
}

/** Build an EntityInspection for a student grade card row. */
function buildGradeInspection(r: GradeCard, groupLabel: string): EntityInspection {
  const pct = r.score !== null && r.maxMarks > 0 ? Math.round((r.score / r.maxMarks) * 100) : null;
  const tone: "ok" | "warn" | "danger" = pct === null ? "neutral" as const : pct >= 40 ? "ok" : "danger";

  const sections: EntityInspection["sections"] = [
    {
      title: "Overview",
      content: (
        <KVPairs
          items={[
            { label: "Subject", value: r.subject ?? "—" },
            { label: "Exam type", value: r.examType },
            { label: "Academic year", value: String(r.academicYear) },
            { label: "Term", value: r.term ?? "—" },
            { label: "Score", value: r.score !== null ? `${r.score} / ${r.maxMarks}` : "—" },
            { label: "Percentage", value: pct !== null ? `${pct}%` : "—" },
            { label: "Published", value: r.publishedAt ? new Date(r.publishedAt).toLocaleString() : "—" },
          ]}
        />
      ),
    },
    {
      title: "Actions",
      content: (
        <ActionRow>
          <InspectorButton href="/student/marks" variant="ghost">
            All marks
          </InspectorButton>
          <InspectorButton href="/student/exams" variant="primary">
            Exam schedule
          </InspectorButton>
        </ActionRow>
      ),
    },
  ];

  return {
    kind: "exam_case",
    title: r.subject ?? r.examType,
    subtitle: groupLabel,
    status: <StatusBadge text={pct !== null ? `${pct}%` : "PENDING"} tone={tone} />,
    sections,
    detailHref: "/student/marks",
    detailLabel: "Grade card",
  };
}

export function StudentMarksPage() {
  const [cards, setCards] = useState<GradeCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { inspection, inspect, closeInspection } = useEntityInspector();

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
                    <tr key={i} className="cursor-pointer hover:bg-bg-elevated/30 transition" onClick={() => inspect(buildGradeInspection(r, label))}>
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

      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </div>
  );
}

export default StudentMarksPage;

