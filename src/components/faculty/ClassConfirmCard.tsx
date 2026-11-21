"use client";

/**
 * ClassConfirmCard — the faculty "Confirm my classes today" card (Flow A).
 *
 * Lists the faculty's scheduled sessions for today, each with its current
 * confirmation state (PENDING / CONFIRMED / NO_SHOW / SUBSTITUTED) + a
 * Confirm button, plus a "Confirm all my classes today" bulk button at the
 * top (the /api/class-sessions/confirm-bulk action). Gated by the
 * `class.confirm` capability (the single resolver) — renders nothing unless
 * the role grants it.
 *
 * Confirmation is intent; attendance is evidence. A green "confirmed" tick
 * here is the pre-class prompt's answer, not a record that the class
 * happened (the HOD no-show alert is what surfaces the real miss).
 */

import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { Check, Clock, CheckCheck, UserMinus } from "lucide-react";

interface TodaySession {
  sessionId: string;
  classId: string;
  className: string;
  subjectCode: string | null;
  periodNo: number;
  sessionDate: string;
  startTime: string;
  facultyId: string | null;
  confirmationState: string;
  confirmedAt: string | null;
  substitute: string | null;
  minutesToStart: number;
}
interface TodayResp {
  data: { sessions: TodaySession[]; pendingToday: number; canConfirmAll: boolean; date: string };
}

// Same-origin browser fetch: assertCsrf validates the Origin header, which a
// same-origin app request always carries — no token needed. Credentials are
// "include" so the HttpOnly access_token cookie rides the POST.
async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function ClassConfirmCardInner() {
  const { data, error, loading, refresh } = useApiResource<TodayResp>(
    "/api/class-sessions/confirmations/today",
    { ttlMs: 120_000 },
  );
  const [busy, setBusy] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const sessions = data?.data?.sessions ?? [];
  const canConfirmAll = data?.data?.canConfirmAll ?? false;

  async function confirmOne(s: TodaySession) {
    setBusy(true);
    setResult(null);
    const res = await postJson(`/api/class-sessions/${s.sessionId}/confirm`, {
      action: "confirm",
      classId: s.classId,
      periodNo: s.periodNo,
      sessionDate: s.sessionDate,
    });
    setBusy(false);
    setResult(res?.success ? "Confirmed." : `Couldn’t confirm: ${JSON.stringify(res?.error ?? res)}`);
    refresh?.();
  }

  async function confirmAll() {
    setBulkBusy(true);
    setResult(null);
    const items = sessions
      .filter((s) => s.confirmationState === "PENDING" || s.confirmationState === "NOT_SCHEDULED")
      .map((s) => ({
        sessionId: s.sessionId,
        classId: s.classId,
        periodNo: s.periodNo,
        sessionDate: s.sessionDate,
      }));
    const res = await postJson("/api/class-sessions/confirm-bulk", {
      action: "confirm",
      items,
    });
    setBulkBusy(false);
    if (res?.success) {
      const okCount = res.data?.confirmed?.length ?? 0;
      const failed = res.data?.failed?.length ?? 0;
      setResult(failed === 0 ? `Confirmed ${okCount} class(es).` : `Confirmed ${okCount}, ${failed} failed.`);
    } else {
      setResult(`Couldn’t confirm all: ${JSON.stringify(res?.error ?? res)}`);
    }
    refresh?.();
  }

  if (loading) {
    return (
      <WidgetBoundary name="ClassConfirmCard" title="Confirm my classes today" capability="class.confirm">
        <PageLoading />
      </WidgetBoundary>
    );
  }
  if (error || sessions.length === 0) {
    return (
      <WidgetBoundary name="ClassConfirmCard" title="Confirm my classes today" capability="class.confirm">
        <div className="surface-card bg-bg-surface p-4 text-sm text-text-muted">
          {error ? "Confirmations unavailable." : "No classes scheduled today — nothing to confirm."}
        </div>
      </WidgetBoundary>
    );
  }

  return (
    <WidgetBoundary name="ClassConfirmCard" title="Confirm my classes today" capability="class.confirm">
      <div className="surface-card bg-bg-surface p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCheck className="h-4 w-4 text-action-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Confirm my classes today</h3>
          </div>
          {canConfirmAll && (
            <button
              type="button"
              onClick={confirmAll}
              disabled={bulkBusy || busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-action-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {bulkBusy ? "Confirming…" : "Confirm all today"}
            </button>
          )}
        </div>

        {result && <div className="text-xs text-action-primary">{result}</div>}

        <div className="space-y-2">
          {sessions.map((s) => {
            const state = s.confirmationState;
            const isPending = state === "PENDING" || state === "NOT_SCHEDULED";
            return (
              <div key={s.sessionId} className="flex items-center justify-between gap-3 rounded-lg bg-bg-elevated p-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">
                    {s.className} · P{s.periodNo}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Clock className="h-3 w-3" />
                    {s.startTime}
                    {state === "CONFIRMED" && <span className="text-emerald-500">· confirmed</span>}
                    {state === "NO_SHOW" && <span className="text-rose-500">· no-show</span>}
                    {state === "SUBSTITUTED" && (
                      <span className="text-amber-500">· substituted{s.substitute ? "" : ""}</span>
                    )}
                  </div>
                </div>
                {isPending ? (
                  <button
                    type="button"
                    onClick={() => confirmOne(s)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-md border border-action-primary/40 px-2.5 py-1 text-xs font-medium text-action-primary hover:bg-action-primary/10 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {busy ? "…" : "Confirm"}
                  </button>
                ) : state === "SUBSTITUTED" ? (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                    <UserMinus className="h-3.5 w-3.5" /> Sub
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                    <CheckCheck className="h-3.5 w-3.5" /> Done
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </WidgetBoundary>
  );
}

export function ClassConfirmCard() {
  return <ClassConfirmCardInner />;
}
