"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { usePassTypes } from "@/hooks/usePassTypes";
import { getAuthHeaders } from "@/lib/utils";
import type { Person } from "@/lib/types";
import {
  Loader2,
  CheckCircle2,
  Send,
  Info
} from "lucide-react";

/* ── shapes ── */

interface PersonsResponse {
  success: boolean;
  data: Person[];
}

interface PermissionRow {
  id: string;
  ticket_number?: string;
  workflow_type?: string;
  status?: string;
  created_at?: string;
}

interface PermissionListData {
  success: boolean;
  data: PermissionRow[];
  total?: number;
}

/* ── helpers ── */

function statusPill(status?: string) {
  const s = (status ?? "PENDING").toUpperCase();
  if (s === "APPROVED" || s === "COMPLETED")
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-400";
  if (s === "REJECTED" || s === "CANCELLED")
    return "border-rose-400/30 bg-rose-400/10 text-rose-400";
  if (s === "PENDING")
    return "border-amber-400/30 bg-amber-400/10 text-amber-400";
  return "border-slate-400/30 bg-slate-400/10 text-slate-400";
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ── main ── */

function PassLeaveSubmissionInner() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? "";

  const {
    data: persons,
    loading: personsLoading,
    error: personsError,
    refresh: refreshPersons,
  } = useApiResource<PersonsResponse>("/api/persons?parentId=me", {
    ttlMs: 30_000,
    enabled: !!userId,
  });

  const wards: Person[] = persons?.data ?? [];
  const [wardId, setWardId] = useState<string>("");
  const [passType, setPassType] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const { passTypes, loading: passTypesLoading } = usePassTypes();

  const {
    data: perms,
    loading: permsLoading,
    refresh: refreshPerms,
  } = useApiResource<PermissionListData>(
    "/api/permissions?status=PENDING",
    { ttlMs: 60_000, enabled: !!userId }
  );

  useEffect(() => {
    if (!wardId && wards[0]) setWardId(wards[0].id);
  }, [wards, wardId]);

  useEffect(() => {
    if (passTypes.length > 0 && !passType) setPassType(passTypes[0].code);
  }, [passTypes, passType]);

  const refresh = useCallback(async () => {
    await Promise.all([refreshPersons(), refreshPerms()]);
  }, [refreshPersons, refreshPerms]);

  usePolling(refresh, { intervalMs: 60_000, enabled: !!userId });

  const rows = useMemo<PermissionRow[]>(() => {
    const r = perms?.data;
    return Array.isArray(r) ? r : [];
  }, [perms]);

  const pendingRows = rows.filter(
    (r) => (r.status ?? "PENDING").toUpperCase() === "PENDING"
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wardId || busy) return;
    setBusy(true);
    setSubmitMsg(null);

    const ward = wards.find((w) => w.id === wardId);
    const wardUserId = ward?.id ?? wardId;
    const typeMeta = passTypes.find((t) => t.code === passType);

    const fromIso = from ? new Date(from).toISOString() : new Date().toISOString();
    let toIso: string;
    if (to) {
      toIso = new Date(to).toISOString();
    } else {
      const t = new Date();
      t.setHours(t.getHours() + (typeMeta?.defaultDurationHours || 4));
      toIso = t.toISOString();
    }

    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          workflow_type: "hostel",
          student_user_id: wardUserId,
          requested_by: "guardian",
          reason: reason || typeMeta?.description || "Guardian-submitted leave request",
          from: fromIso,
          to: toIso,
          requestedById: user?.id,
          requestedByName: user?.name,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setSubmitMsg({
          ok: true,
          text: `Request submitted (${json.data?.ticket_number ?? "ticket created"}). Submission only — the approval chain proceeds at the campus offices.`,
        });
        setReason("");
        refreshPerms();
      } else {
        setSubmitMsg({
          ok: false,
          text: json?.error?.message || json?.error || "Failed to submit the request.",
        });
      }
    } catch {
      setSubmitMsg({ ok: false, text: "Network error — please retry." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <Send className="w-6 h-6 text-emerald-400" />
            Pass &amp; Leave Request Submission
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Submit a pass or leave request for a linked ward
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-200 flex items-start gap-2.5">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
        <p>
          <strong className="font-semibold text-amber-100">Submission only — no approval authority.</strong>{" "}
          You may submit pass/leave requests on behalf of your wards, but approval is handled by
          the designated campus approval chain (caregiver → warden → principal).
        </p>
      </div>

      {personsError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          Could not load wards.{" "}
          <button type="button" onClick={() => void refreshPersons()} className="underline font-semibold">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── submission form ── */}
        <form
          onSubmit={submit}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 space-y-4"
        >
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            New request
          </h2>

          {wards.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-2">
              No wards linked to your account.
            </p>
          ) : (
            <>
              <div>
                <label htmlFor="ward" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Linked ward
                </label>
                <select
                  id="ward"
                  value={wardId}
                  onChange={(e) => setWardId(e.target.value)}
                  disabled={busy}
                  className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                >
                  {wards.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.fullName || w.name || "Ward"} · {w.uniqueId || w.roll || ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="passType" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Request type
                </label>
                <select
                  id="passType"
                  value={passType}
                  onChange={(e) => setPassType(e.target.value)}
                  disabled={busy || passTypesLoading}
                  className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                >
                  {passTypes.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name} ({t.defaultDurationHours} hrs)
                    </option>
                  ))}
                </select>
                {passType && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {passTypes.find((t) => t.code === passType)?.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="from" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    From
                  </label>
                  <input
                    id="from"
                    type="datetime-local"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    min={toLocalInputValue(new Date().toISOString())}
                    disabled={busy}
                    className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="to" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    To
                  </label>
                  <input
                    id="to"
                    type="datetime-local"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    disabled={busy}
                    className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reason" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Reason / notes
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Reason for the pass or leave (optional)"
                  disabled={busy}
                  className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={busy || wards.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold w-full sm:w-auto"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {busy ? "Submitting…" : "Submit request"}
              </button>

              {submitMsg && (
                <div
                  className={`rounded-lg border p-3 text-sm ${
                    submitMsg.ok
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                      : "border-rose-400/30 bg-rose-400/10 text-rose-300"
                  } flex items-start gap-2`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{submitMsg.text}</span>
                </div>
              )}
            </>
          )}
        </form>

        {/* ── ward request status list ── */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              Ward request status
            </h2>
            <span className="text-xs text-[var(--text-muted)]">
              {pendingRows.length} pending
            </span>
          </div>

          {permsLoading && rows.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading requests…
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-muted)]">
              No requests found for your wards.
            </div>
          ) : (
            <div className="space-y-2">
              {rows.slice(0, 12).map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-base)]/50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] font-mono">
                      {r.ticket_number || r.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {r.workflow_type || "—"}
                      {r.created_at ? ` · ${new Date(r.created_at).toLocaleDateString("en-IN")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${statusPill(r.status)}`}
                    >
                      {r.status || "PENDING"}
                    </span>
                    <Link
                      href={`/guardian/request-status?ticket=${encodeURIComponent(r.ticket_number ?? r.id)}`}
                      className="text-xs text-emerald-400 hover:underline"
                    >
                      View timeline
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <DevContactStrip />
    </div>
  );
}

export default function PassLeaveSubmissionPage() {
  return (
    <WidgetBoundary title="Pass and Leave Request Submission">
      <Suspense fallback={<PageLoading />}>
        <PassLeaveSubmissionInner />
      </Suspense>
    </WidgetBoundary>
  );
}
