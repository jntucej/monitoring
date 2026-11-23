"use client";
// src/components/complaints/ComplaintDetail.tsx

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getAuthHeaders } from "@/lib/utils";
import { ComplaintTimeline } from "@/components/shared/complaints/ComplaintTimeline";
import { useAuthStore } from "@/stores/authStore";
import { resolveComplaintAbility, makeViewer } from "@/lib/record-abilities";
import { getComplaintRulesForRole } from "@/lib/complaint-rules";
import { RecordAbilityBanner } from "@/components/shared/RecordAbilityBanner";
import { SmartTextRef } from "@/components/nav/SmartTextRef";

export function ComplaintDetail({ role }: { role: string }) {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const r = await fetch(`/api/complaints/${id}`, { headers: getAuthHeaders() });
    const j = await r.json();
    setData(j.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const [actionError, setActionError] = useState<string | null>(null);

  const patchAction = async (action: string, extra: Record<string, unknown> = {}) => {
    setActionError(null);
    const prevData = data;

    // Optimistic local update
    if (data?.complaint) {
      const nextStatus =
        action === "resolve"
          ? "resolved"
          : action === "in_progress"
            ? "in_progress"
            : action === "acknowledge"
              ? "acknowledged"
              : action === "escalate"
                ? "escalated"
                : data.complaint.status;
      const nextTimeline =
        action === "add_note" && typeof extra.note === "string"
          ? [
              ...(data.timeline ?? []),
              {
                id: `optimistic-${Date.now()}`,
                action: "note",
                status: nextStatus,
                ownerRole: role,
                notes: extra.note,
                dueAt: null,
              },
            ]
          : data.timeline;
      setData({
        ...data,
        complaint: { ...data.complaint, status: nextStatus },
        timeline: nextTimeline,
      });
    }

    try {
      const r = await fetch(`/api/complaints/${id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.success) {
        load();
      } else {
        // Rollback on failure (including 403 / 409)
        setData(prevData);
        const msg =
          r.status === 403
            ? "Permission denied (403): your role cannot perform this action."
            : r.status === 409
              ? "Conflict (409): this complaint was updated elsewhere. Rolled back."
              : j.error?.message ?? `Action failed (HTTP ${r.status})`;
        setActionError(msg);
      }
    } catch {
      setData(prevData);
      setActionError("Network error — changes rolled back.");
    }
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    await patchAction("add_note", { note: noteText });
    setNoteText("");
  };

  const resolveComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionSummary.trim()) return;
    await patchAction("resolve", { resolutionSummary });
    setResolutionSummary("");
  };

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch(`/api/complaints/${id}/feedback`, {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment: feedbackComment }),
    });
    const j = await r.json();
    if (j.success) load();
    else alert(j.error?.message ?? "Failed");
  };

  const uploadAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const form = new FormData();
    form.append("files", file);
    const r = await fetch(`/api/complaints/${id}/attachments`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: form,
    });
    const j = await r.json();
    if (j.success) {
      setFile(null);
      load();
    } else alert(j.error?.message ?? "Upload failed");
  };

  if (loading) return <p className="text-text-muted">Loading…</p>;
  if (!data?.complaint) return <p className="text-text-muted">Complaint not found.</p>;

  const c = data.complaint;

  const isAuthority = role !== "student";

  // Role-ability layer: why THIS role is on this complaint. The real action
  // buttons below are still gated by `role` + status; this is the reason
  // banner + the role's next-step pivots.
  const viewer = makeViewer(role, {
    userId: useAuthStore.getState().user?.id ?? "",
    hostelScope: useAuthStore.getState().user?.studentDetails?.hostelBlock ?? null,
  });
  const ability = resolveComplaintAbility(
    {
      id: c.id ?? id,
      complaint_number: c.complaintNumber,
      category: c.categoryLabel ?? c.category,
      status: c.status,
      current_stage: c.currentOwnerRole,
      raised_by_user_id: c.filer_user_id ?? c.raised_by_user_id,
      hostel_scope: c.hostel_scope ?? null,
    },
    viewer,
  );

  const complaintRules = getComplaintRulesForRole(
    {
      role,
      userId: useAuthStore.getState().user?.id ?? "",
      hostelScope: useAuthStore.getState().user?.studentDetails?.hostelBlock ?? null,
    },
    {
      id: c.id ?? id,
      complaintNumber: c.complaintNumber,
      category: c.categoryLabel ?? c.category,
      status: c.status ?? "OPEN",
      currentStage: c.currentOwnerRole,
      raisedByUserId: c.filer_user_id ?? c.raised_by_user_id,
      hostelScope: c.hostel_scope ?? null,
    },
  );

  return (
    <div
      className="max-w-4xl mx-auto space-y-6"
      data-role-tier={complaintRules.tierLabel.split("•")[0].trim().toLowerCase().replace(/\s+/g, "-")}
      data-event-mode={complaintRules.mode}
    >
      <div className="surface-card pb-4">
        <span className="font-mono text-xs text-text-muted">{c.complaintNumber}</span>
        <h1 className="text-2xl font-semibold text-text-primary mt-1">{c.title}</h1>
        <p className="text-sm text-text-muted mt-1">
          {c.categoryLabel} · Status: <strong className="uppercase">{c.status}</strong> · Owner:{" "}
          <span className="font-mono">{c.currentOwnerRole}</span>
        </p>
      </div>

      {/* Role-ability banner: why this role is on this complaint */}
      <RecordAbilityBanner
        ability={ability}
        fullRoute={role === "student" ? `/student/complaints/${id}` : `/complaints/${id}`}
      />

      {actionError && (
        <div
          role="alert"
          data-testid="complaint-action-error"
          className="surface-card border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-action-danger"
        >
          {actionError}
        </div>
      )}

      <div className="surface-card bg-bg-elevated p-2.5 space-y-2">
        <h2 className="font-medium text-text-primary">Description</h2>
        <p className="text-sm text-text-muted whitespace-pre-wrap">
          <SmartTextRef text={c.description ?? ""} currentPath="/complaints" />
        </p>
      </div>

      {(c.targetRole || c.targetUserId || c.presenceMark) && (
        <div
          data-testid="complaint-hierarchy-target"
          className="surface-card bg-bg-elevated p-2.5 space-y-1 text-xs"
        >
          <h2 className="font-medium text-text-primary">Hierarchy Target &amp; Presence</h2>
          <div className="flex flex-wrap gap-2 text-text-muted">
            {c.targetRole && (
              <span>
                Target Role: <strong className="text-text-primary">{c.targetRole}</strong>
              </span>
            )}
            {c.targetUserId && (
              <span>
                Person: <strong className="font-mono text-text-primary">{c.targetUserId}</strong>
              </span>
            )}
            {c.presenceMark && (
              <span>
                Presence: <strong className="text-text-primary">{c.presenceMark}</strong>
              </span>
            )}
          </div>
          {c.presenceNote && (
            <p className="text-text-muted">{c.presenceNote}</p>
          )}
        </div>
      )}

      {c.respondent_details && (
        <div className="surface-card bg-bg-elevated p-2.5 space-y-2">
          <h2 className="font-medium text-text-primary">About</h2>
          <p className="text-sm text-text-muted">
            <span className="font-medium text-text-primary font-mono">
              <SmartTextRef text={c.respondent_details} currentPath="/complaints" />
            </span>
            <p className="mt-1 text-xs text-text-muted">
              The person this complaint concerns, as identified by the filer.
            </p>
          </p>
        </div>
      )}

      {/* Lifecycle timeline (the TRACK step) */}
      <div className="surface-card bg-bg-elevated p-2.5">
        <h2 className="font-medium text-text-primary mb-3">Status timeline</h2>
        <ComplaintTimeline
          events={(data.timeline ?? []).map((t: { status: string; at: string; note?: string }) => ({
            status: t.status,
            at: t.at,
            note: t.note,
          }))}
          currentStatus={c.status}
        />
        {c.resolutionSummary && (
          <div className="mt-3 pt-3">
            <h3 className="font-medium text-action-success">Resolution Summary</h3>
            <p className="text-sm text-action-success">{c.resolutionSummary}</p>
          </div>
        )}
      </div>

      {/* Authority Action Buttons */}
      {isAuthority && (
        <div className="flex gap-2 flex-wrap">
          {c.status === "submitted" && (
            <button onClick={() => patchAction("acknowledge")} className="px-3 py-1.5 bg-action-info text-white text-sm">
              Acknowledge
            </button>
          )}
          {["submitted", "acknowledged"].includes(c.status) && (
            <button onClick={() => patchAction("start")} className="px-3 py-1.5 bg-action-warning text-white text-sm">
              Start work
            </button>
          )}
          {["submitted", "acknowledged", "in_progress"].includes(c.status) && (
            <div className="w-full mt-2 pt-2 flex gap-2 items-center">
              <input
                placeholder="Resolution summary…"
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                className="p-1.5 text-sm flex-1 border border-border"
              />
              <button onClick={resolveComplaint} className="px-3 py-1.5 bg-action-success text-white text-sm">
                Resolve
              </button>
            </div>
          )}
          <button onClick={() => patchAction("escalate")} className="px-3 py-1.5 bg-bg-elevated text-white text-sm">
            Forward / Escalate
          </button>
          <button onClick={() => patchAction("reject")} className="px-3 py-1.5 bg-action-danger text-white text-sm">
            Reject
          </button>
        </div>
      )}

      {/* Student action buttons: cancel (within 24h) */}
      {role === "student" && !["resolved", "closed", "rejected"].includes(c.status) && (
        <div className="surface-card flex gap-2 p-2.5 bg-bg-elevated">
          <button
            onClick={() => patchAction("cancel")}
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-medium hover:bg-rose-500/20"
          >
            Cancel complaint (within 24h)
          </button>
          {c.slaDeadline && new Date(c.slaDeadline).getTime() < Date.now() && (
            <button
              onClick={() => patchAction("escalate")}
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs font-medium hover:bg-amber-500/20"
            >
              Escalate (SLA breached)
            </button>
          )}
        </div>
      )}

      {/* Feedback section for student when resolved */}
      {role === "student" && ["resolved", "awaiting_verification"].includes(c.status) && !data.feedback && (
        <form onSubmit={submitFeedback} className="surface-card p-2.5 bg-action-success/10 space-y-3">
          <h2 className="font-medium text-text-primary">Leave resolution feedback</h2>
          <div className="flex gap-2 items-center">
            <label className="text-sm">Rating (1-5):</label>
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="surface-card p-1 text-sm">
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Good</option>
              <option value="3">3 - Average</option>
              <option value="2">2 - Bad</option>
              <option value="1">1 - Very Bad</option>
            </select>
          </div>
          <textarea
            placeholder="Comments (optional)"
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
            className="surface-card w-full p-2 text-sm bg-white"
          />
          <button type="submit" className="surface-card px-3 py-1.5 bg-action-success text-white text-sm">
            Submit & Close
          </button>
        </form>
      )}

      {/* Tasks / Timeline */}
      <div className="space-y-3">
        <h2 className="font-medium text-text-primary">Timeline & Tasks</h2>
        <div className="border rounded divide-y bg-white text-sm">
          {data.tasks.map((t: any) => (
            <div key={t.id} className="p-3 space-y-1">
              <div className="flex justify-between font-medium">
                <span>{t.action}</span>
                <span className="uppercase text-xs text-text-muted font-mono">{t.status}</span>
              </div>
              <p className="text-xs text-text-muted">Role: {t.ownerRole} · Due: {t.dueAt ? new Date(t.dueAt).toLocaleString() : "None"}</p>
              {t.notes && <p className="surface-card text-text-muted mt-1 bg-bg-elevated p-2 font-mono"><SmartTextRef text={t.notes} currentPath="/complaints" /></p>}
            </div>
          ))}
        </div>

        {/* Add Note */}
        <form onSubmit={addNote} className="flex gap-2 pt-2">
          <input
            placeholder="Add internal note / comment…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="surface-card p-2 text-sm flex-1"
          />
          <button type="submit" className="surface-card px-3 py-2 bg-bg-elevated text-white text-sm">
            Post note
          </button>
        </form>
      </div>

      {/* Attachments */}
      <div className="surface-card space-y-3 pt-4">
        <h2 className="font-medium text-text-primary">Attachments</h2>
        <div className="flex flex-wrap gap-2">
          {data.attachments.map((a: any) => (
            <a
              key={a.id}
              href={`/api/complaints/${id}/attachments/${a.id}`}
              target="_blank"
              rel="noreferrer"
              className="surface-card px-3 py-1.5 bg-white text-xs hover:bg-bg-elevated flex items-center gap-1.5"
            >
              <span>{a.name}</span>
              {a.internal && <span className="surface-card text-xs bg-action-warning/20 text-action-warning px-1">Internal</span>}
            </a>
          ))}
        </div>
        <form onSubmit={uploadAttachment} className="flex gap-2 items-center pt-2">
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          <button type="submit" disabled={!file} className="surface-card px-3 py-1.5 bg-bg-elevated text-white text-sm">
            Upload file
          </button>
        </form>
      </div>
    </div>
  );
}
