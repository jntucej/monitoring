"use client";

import { useEffect, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Loader2, CalendarClock, Inbox, FileText } from "lucide-react";

interface NextExam {
  date: string;
  label: string;
  subject: string | null;
}

export function StudentExamsPage() {
  const [nextExam, setNextExam] = useState<NextExam | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/student/next-exam", { credentials: "include" });
        const json = await res.json();
        if (json.success && json.data) setNextExam(json.data);
        else setError(json.error?.message ?? "Failed to load exam schedule");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load exam schedule");
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Exams</h1>
        <p className="text-sm text-text-muted">Your next scheduled exam and where your results live.</p>
      </div>

      {error && <div className="surface-card bg-rose-500/10 p-3 text-sm text-action-danger">{error}</div>}
      {nextExam === null && !error && (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading exam schedule…
        </div>
      )}

      {nextExam && (
        <WidgetBoundary name="student-next-exam" title="Next exam">
          <div className="surface-card p-4 flex items-center gap-3">
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
          </div>
        </WidgetBoundary>
      )}

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

      {!nextExam && !error && (
        <div className="surface-card p-8 text-center">
          <Inbox className="w-6 h-6 text-text-muted mx-auto mb-2" />
          <p className="text-sm text-text-muted">No upcoming exams scheduled.</p>
        </div>
      )}
    </div>
  );
}

export default StudentExamsPage;
