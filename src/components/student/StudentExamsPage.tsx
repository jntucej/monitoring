"use client";

import { useEffect, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { ExamEligibilityChecklist } from "@/components/student/ExamEligibilityChecklist";
import { HallTicketStatusCard } from "@/components/student/HallTicketStatusCard";
import { Loader2, CalendarClock, Inbox, FileText } from "lucide-react";
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

interface NextExam {
  date: string;
  label: string;
  subject: string | null;
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

/** Build an EntityInspection for a student exam record. */
function buildExamInspection(exam: NextExam): EntityInspection {
  const daysUntil = Math.ceil((new Date(exam.date).getTime() - Date.now()) / 86400000);
  const tone: "ok" | "warn" | "danger" = daysUntil <= 1 ? "danger" : daysUntil <= 7 ? "warn" : "ok";

  const sections: EntityInspection["sections"] = [
    {
      title: "Overview",
      content: (
        <KVPairs
          items={[
            { label: "Subject", value: exam.subject ?? exam.label },
            { label: "Label", value: exam.label },
            { label: "Date", value: new Date(exam.date).toLocaleDateString() },
            { label: "Days remaining", value: daysUntil >= 0 ? String(daysUntil) : "Past" },
          ]}
        />
      ),
    },
    {
      title: "Actions",
      content: (
        <ActionRow>
          <InspectorButton href="/student/marks" variant="primary">
            View results
          </InspectorButton>
          <InspectorButton href="/student/exams" variant="ghost">
            All exams
          </InspectorButton>
        </ActionRow>
      ),
    },
  ];

  return {
    kind: "exam_case",
    title: exam.subject ?? exam.label,
    subtitle: new Date(exam.date).toLocaleDateString(),
    status: <StatusBadge text={daysUntil <= 1 ? "IMMINENT" : "SCHEDULED"} tone={tone} />,
    sections,
    detailHref: "/student/exams",
    detailLabel: "Exam schedule",
  };
}

export function StudentExamsPage() {
  const [nextExam, setNextExam] = useState<NextExam | null>(null);
  const [attendancePct, setAttendancePct] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { inspection, inspect, closeInspection } = useEntityInspector();

  useEffect(() => {
    (async () => {
      try {
        const [examRes, attRes] = await Promise.all([
          fetch("/api/student/next-exam", { credentials: "include" }),
          fetch("/api/student/attendance", { credentials: "include" }),
        ]);
        const examJson = await examRes.json();
        if (examJson.success) setNextExam(examJson.data ?? null);
        else setError(examJson.error?.message ?? "Failed to load exam schedule");

        const attJson = await attRes.json().catch(() => null);
        const s = attJson?.data?.summary ?? attJson?.summary;
        if (s?.pct !== undefined && s?.total > 0) {
          setAttendancePct(Number(s.pct));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load exam schedule");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const examEligible =
    attendancePct !== null ? attendancePct >= 75 : undefined;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Exams</h1>
        <p className="text-sm text-text-muted">Your next scheduled exam and where your results live.</p>
      </div>

      {error && <div className="surface-card bg-rose-500/10 p-3 text-sm text-action-danger">{error}</div>}
      {loading && !error && (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading exam schedule…
        </div>
      )}

      {nextExam && (
        <WidgetBoundary name="student-next-exam" title="Next exam">
          <button
            type="button"
            onClick={() => inspect(buildExamInspection(nextExam))}
            className="surface-card p-4 flex items-center gap-3 w-full text-left hover:bg-bg-elevated/60 transition cursor-pointer"
          >
            <CalendarClock className="w-6 h-6 text-action-info shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                {nextExam.subject ?? nextExam.label}
              </p>
              <p className="text-xs text-text-muted">
                {new Date(nextExam.date).toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </button>
        </WidgetBoundary>
      )}

      {/* Exam eligibility + hall ticket (real attendance-driven; no-data states when unknown) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <WidgetBoundary name="exam-eligibility" title="Exam eligibility">
          <ExamEligibilityChecklist attendancePct={attendancePct ?? undefined} />
        </WidgetBoundary>
        <WidgetBoundary name="hall-ticket" title="Hall ticket">
          <HallTicketStatusCard
            isEligible={examEligible}
            examName={nextExam ? (nextExam.subject ?? nextExam.label) : undefined}
            examDate={nextExam ? new Date(nextExam.date).toLocaleDateString() : undefined}
          />
        </WidgetBoundary>
      </div>

      {/* Results: published marks live on the Marks page (read-only grade card). */}
      <WidgetBoundary name="student-exam-results" title="Results">
        <div className="surface-card p-4 flex items-center gap-3">
          <FileText className="w-6 h-6 text-action-success shrink-0" />
          <div>
            <p className="text-sm text-text-secondary">
              Exam results and marks appear on your{" "}
              <a href="/student/marks" className="font-semibold text-action-primary underline">
                Marks
              </a>{" "}
              page once published by the faculty.
            </p>
          </div>
        </div>
      </WidgetBoundary>

      {!loading && !nextExam && !error && (
        <div className="surface-card p-8 text-center">
          <Inbox className="w-6 h-6 text-text-muted mx-auto mb-2" />
          <p className="text-sm font-medium text-text-primary">No upcoming exams scheduled</p>
          <p className="text-xs text-text-muted mt-1">
            When the Exam Branch publishes your next exam timetable, it will appear here automatically.
          </p>
        </div>
      )}

      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </div>
  );
}

export default StudentExamsPage;
