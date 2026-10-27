// src/components/complaints/ComplaintDetail.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getAuthHeaders } from "@/lib/utils";

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

  const patchAction = async (action: string, extra = {}) => {
    const r = await fetch(`/api/complaints/${id}`, {
      method: "PATCH",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const j = await r.json();
    if (j.success) load();
    else alert(j.error?.message ?? "Failed");
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

  if (loading) return <p className="p-6 text-slate-500">Loading…</p>;
  if (!data?.complaint) return <p className="p-6 text-slate-500">Complaint not found.</p>;

  const c = data.complaint;
  const isRaiser = role === "student" && c.raised_by; // Note: client view might verify auth store
  const isAuthority = role !== "student";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="border-b pb-4">
        <span className="font-mono text-xs text-slate-500">{c.complaintNumber}</span>
        <h1 className="text-2xl font-semibold text-slate-900 mt-1">{c.title}</h1>
        <p className="text-sm text-slate-600 mt-1">
          {c.categoryLabel} · Status: <strong className="uppercase">{c.status}</strong> · Owner:{" "}
          <span className="font-mono">{c.currentOwnerRole}</span>
        </p>
      </div>

      <div className="bg-slate-50 border rounded p-4 space-y-2">
        <h2 className="font-medium text-slate-900">Description</h2>
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.description}</p>
        {c.resolutionSummary && (
          <div className="mt-3 pt-3 border-t">
            <h3 className="font-medium text-emerald-800">Resolution Summary</h3>
            <p className="text-sm text-emerald-700">{c.resolutionSummary}</p>
          </div>
        )}
      </div>

      {/* Authority Action Buttons */}
      {isAuthority && (
        <div className="flex gap-2 flex-wrap border p-4 rounded bg-white">
          {c.status === "submitted" && (
            <button onClick={() => patchAction("acknowledge")} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm">
              Acknowledge
            </button>
          )}
          {["submitted", "acknowledged"].includes(c.status) && (
            <button onClick={() => patchAction("start")} className="px-3 py-1.5 rounded bg-amber-600 text-white text-sm">
              Start work
            </button>
          )}
          {["submitted", "acknowledged", "in_progress"].includes(c.status) && (
            <div className="w-full mt-2 pt-2 border-t flex gap-2 items-center">
              <input
                placeholder="Resolution summary…"
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                className="border rounded p-1.5 text-sm flex-1"
              />
              <button onClick={resolveComplaint} className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm">
                Resolve
              </button>
            </div>
          )}
          <button onClick={() => patchAction("escalate")} className="px-3 py-1.5 rounded bg-slate-700 text-white text-sm">
            Forward / Escalate
          </button>
          <button onClick={() => patchAction("reject")} className="px-3 py-1.5 rounded bg-rose-600 text-white text-sm">
            Reject
          </button>
        </div>
      )}

      {/* Feedback section for student when resolved */}
      {role === "student" && ["resolved", "awaiting_verification"].includes(c.status) && !data.feedback && (
        <form onSubmit={submitFeedback} className="border p-4 rounded bg-emerald-50 space-y-3">
          <h2 className="font-medium text-emerald-950">Leave resolution feedback</h2>
          <div className="flex gap-2 items-center">
            <label className="text-sm">Rating (1-5):</label>
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="border rounded p-1 text-sm">
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
            className="w-full border rounded p-2 text-sm bg-white"
          />
          <button type="submit" className="px-3 py-1.5 rounded bg-emerald-700 text-white text-sm">
            Submit & Close
          </button>
        </form>
      )}

      {/* Tasks / Timeline */}
      <div className="space-y-3">
        <h2 className="font-medium text-slate-900">Timeline & Tasks</h2>
        <div className="border rounded divide-y bg-white text-sm">
          {data.tasks.map((t: any) => (
            <div key={t.id} className="p-3 space-y-1">
              <div className="flex justify-between font-medium">
                <span>{t.action}</span>
                <span className="uppercase text-xs text-slate-500 font-mono">{t.status}</span>
              </div>
              <p className="text-xs text-slate-500">Role: {t.ownerRole} · Due: {t.dueAt ? new Date(t.dueAt).toLocaleString() : "None"}</p>
              {t.notes && <p className="text-slate-700 mt-1 bg-slate-50 p-2 rounded">{t.notes}</p>}
            </div>
          ))}
        </div>

        {/* Add Note */}
        <form onSubmit={addNote} className="flex gap-2 pt-2">
          <input
            placeholder="Add internal note / comment…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="border rounded p-2 text-sm flex-1"
          />
          <button type="submit" className="px-3 py-2 rounded bg-slate-800 text-white text-sm">
            Post note
          </button>
        </form>
      </div>

      {/* Attachments */}
      <div className="space-y-3 pt-4 border-t">
        <h2 className="font-medium text-slate-900">Attachments</h2>
        <div className="flex flex-wrap gap-2">
          {data.attachments.map((a: any) => (
            <a
              key={a.id}
              href={`/api/complaints/${id}/attachments/${a.id}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 border rounded bg-white text-xs hover:bg-slate-50 flex items-center gap-1.5"
            >
              <span>{a.name}</span>
              {a.internal && <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded">Internal</span>}
            </a>
          ))}
        </div>
        <form onSubmit={uploadAttachment} className="flex gap-2 items-center pt-2">
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          <button type="submit" disabled={!file} className="px-3 py-1.5 rounded bg-slate-800 text-white text-sm">
            Upload file
          </button>
        </form>
      </div>
    </div>
  );
}
