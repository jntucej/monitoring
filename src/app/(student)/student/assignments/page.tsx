"use client";

// src/app/(student)/student/assignments/page.tsx
// Student portal: "My assignments" — list the assignments for the student's
// classes, with their submission status, and a submit button (file → the
// attachment jsonb) that posts /api/assignments/[id]/submit.
//
// Thin wrapper around a list + one submit affordance. No new upload
// component — the submission is a single POST with a file reference (the
// attachment-storage shape is the jsonb attachment field).

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { getAuthHeaders } from "@/lib/utils";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { FileUp, Check, Clock, Loader2 } from "lucide-react";
import { AssignmentConfirmationBar } from "@/components/nav/AssignmentConfirmationBar";
import { useUIStore } from "@/stores/uiStore";

interface StudentAssignment {
  id: string;
  classId: string;
  title: string;
  description: string | null;
  dueAt: string;
  maxMarks: number | null;
  submitted: number;
  total: number;
  // the student's own status, joined in the GET response
  myStatus: string; // PENDING | SUBMITTED | LATE | GRADED | ABSENT
  myMarks: number | null;
  myFeedback: string | null;
}

interface Resp {
  success: boolean;
  data: { assignments: StudentAssignment[] };
}

function StudentAssignmentsInner() {
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student/assignments", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
      setData(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  async function submit(id: string) {
    setSubmittingId(id);
    setResult(null);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const res = await fetch(`/api/assignments/${id}/submit`, {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            attachment: {
              // The attachment-storage Saved shape (a reference, not the blob —
              // the server persists it via saveAttachment on demand).
              fileName: file.name,
              contentType: file.type || "application/pdf",
              sizeBytes: file.size,
            },
          }),
        });
        const j = await res.json();
        setResult({
          id,
          ok: !!j.success,
          msg: j.success ? `Submitted (${j.data?.status ?? "ok"})` : j?.error?.message ?? "Submit failed",
        });
        if (j.success) load();
      } catch (e) {
        setResult({ id, ok: false, msg: e instanceof Error ? e.message : String(e) });
      } finally {
        setSubmittingId(null);
      }
    };
    input.click();
  }

  if (loading) {
    return (
      <WidgetBoundary name="StudentAssignments" title="My assignments" capability="assignment.view">
        <PageLoading />
      </WidgetBoundary>
    );
  }
  if (error) {
    return (
      <WidgetBoundary name="StudentAssignments" title="My assignments" capability="assignment.view">
        <div className="surface-card bg-bg-surface p-4 text-sm text-text-muted">
          Assignments unavailable{error ? `: ${error}` : ""}.
        </div>
      </WidgetBoundary>
    );
  }
  const rows = data?.data?.assignments ?? [];

  return (
    <WidgetBoundary name="StudentAssignments" title="My assignments" capability="assignment.view">
      <div className="surface-card bg-bg-surface p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileUp className="h-4 w-4 text-action-primary" />
          <h3 className="text-sm font-semibold text-text-primary">My assignments</h3>
        </div>
        {result && (
          <div className={`text-xs ${result.ok ? "text-emerald-500" : "text-rose-500"}`}>{result.msg}</div>
        )}
        {rows.length === 0 ? (
          <p className="text-sm text-text-muted">No assignments assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((a) => {
              const status = a.myStatus;
              const done = status === "GRADED" || status === "SUBMITTED";
              const late = new Date(a.dueAt).getTime() < Date.now();
              return (
                <div key={a.id} className="rounded-lg bg-bg-elevated p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">{a.title}</div>
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Clock className="h-3 w-3" />
                        Due {new Date(a.dueAt).toLocaleDateString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {late && status === "PENDING" && <span className="text-amber-500">· overdue</span>}
                      </div>
                    </div>
                    <div className="text-xs">
                      {status === "GRADED" && <span className="text-emerald-500">Graded: {a.myMarks}{a.myFeedback ? ` · ${a.myFeedback.slice(0, 30)}` : ""}</span>}
                      {status === "SUBMITTED" && <span className="text-emerald-500">Submitted</span>}
                      {status === "LATE" && <span className="text-amber-500">Submitted late</span>}
                      {status === "ABSENT" && <span className="text-rose-500">Marked absent</span>}
                      {status === "PENDING" && <span className="text-text-muted">Not submitted</span>}
                    </div>
                  </div>
                  {(status === "PENDING" || status === "LATE") && (
                    <button
                      type="button"
                      onClick={() => submit(a.id)}
                      disabled={submittingId === a.id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-action-primary/40 px-3 py-1.5 text-xs font-medium text-action-primary hover:bg-action-primary/10 disabled:opacity-50"
                    >
                      {submittingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                      {status === "LATE" ? "Resubmit" : "Submit"}
                    </button>
                  )}
                  {done && status === "GRADED" && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                      <Check className="h-3.5 w-3.5" /> Graded
                    </span>
                  )}
                  <div className="w-full pt-2">
                    <AssignmentConfirmationBar
                      assignment={{
                        id: a.id,
                        title: a.title,
                        dueDate: new Date(a.dueAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
                        confirmedByCr: done,
                        verifiedByFaculty: status === "GRADED",
                      }}
                      role={user?.role ?? "student"}
                      onAction={(act, note) => {
                        addToast({
                          message: `${act.label} recorded for ${a.title}${note ? `: ${note}` : ""}`,
                          variant: "success",
                        });
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default function StudentAssignmentsPage() {
  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 overflow-x-hidden space-y-6 px-4 py-6 md:px-6">
      <StudentAssignmentsInner />
    </div>
  );
}
