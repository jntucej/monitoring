"use client";
// src/app/(student)/student/class-requests/page.tsx
// Student portal: "Raise a request" picker + "My requests" + coordinator card.
// All mutations go through the API routes (the kernel boundary).

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { getAuthHeaders } from "@/lib/utils";

const CATEGORIES = [
  { code: "ACADEMIC", label: "Academic", icon: "📚" },
  { code: "ATTENDANCE", label: "Attendance", icon: "🕐" },
  { code: "EXAM", label: "Examination", icon: "📝" },
  { code: "TIMETABLE", label: "Timetable", icon: "📅" },
  { code: "ROOM", label: "Room / Lab", icon: "🏫" },
  { code: "FACULTY", label: "Faculty concern", icon: "👨‍🏫" },
  { code: "SUGGESTION", label: "Suggestion", icon: "💡" },
  { code: "URGENT", label: "Urgent", icon: "🚨" },
] as const;

interface MyRequest {
  id: string;
  category_code: string;
  title: string;
  priority: string;
  status: string;
  assigned_role: string | null;
  class: string;
  created_at: string;
  resolved_at: string | null;
}

export default function StudentClassRequestsPage() {
  const user = useAuthStore(s => s.user);
  const [requests, setRequests] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Raise form
  const [category, setCategory] = useState<string>("ACADEMIC");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [classId, setClassId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Resolve the student's class (uuid) from their department code.
  useEffect(() => {
    if (!user?.id || !user.departmentId) return;
    fetch("/api/students/me/class", { headers: getAuthHeaders(), cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (d?.classId) setClassId(d.classId); })
      .catch(() => {});
  }, [user?.id, user?.departmentId]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch("/api/class-requests", { headers: getAuthHeaders(), cache: "no-store" });
      const data = await res.json();
      if (data.success) setRequests((data.data ?? []) as MyRequest[]);
    } catch { /* network */ }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);

  async function raise(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || !classId) { setMsg({ ok: false, text: "Your class could not be resolved — try again later." }); return; }
    setMsg(null); setSubmitting(true);
    try {
      const res = await fetch("/api/class-requests", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ classId, category, title, body, priority: category === "URGENT" ? "urgent" : "normal" }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ ok: true, text: "Request raised — routed to the responsible office." });
        setTitle(""); setBody("");
        void load();
      } else {
        setMsg({ ok: false, text: data.error?.message ?? "Could not raise the request." });
      }
    } catch {
      setMsg({ ok: false, text: "Network error — try again." });
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-3xl mx-auto">
      <header>
        <h1 className="text-lg font-bold text-text-primary">Class requests</h1>
        <p className="text-xs text-text-muted mt-1">
          Raise a concern and it routes automatically to the right office. Urgent items page the HOD directly.
        </p>
      </header>

      {/* Raise a request */}
      <section className="surface-card rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Raise a request</h2>
        <div className="grid grid-cols-4 gap-1.5">
          {CATEGORIES.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => setCategory(c.code)}
              className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition ${
                category === c.code
                  ? "border-action-primary bg-action-primary/10"
                  : "border-border bg-bg-base hover:border-text-muted"
              }`}
            >
              <span className="text-lg">{c.icon}</span>
              <span className="text-[10px] font-medium text-text-secondary leading-tight">{c.label}</span>
            </button>
          ))}
        </div>
        <form onSubmit={raise} className="space-y-2.5">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={120}
            required
            placeholder="Short title (max 120 chars)"
            className="surface-card w-full p-2.5 bg-bg-base text-sm text-text-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-action-primary"
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={2}
            placeholder="Details (optional)"
            className="surface-card w-full p-2.5 bg-bg-base text-sm text-text-primary rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-action-primary"
          />
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="w-full rounded-lg bg-action-primary text-white text-sm font-semibold py-2 disabled:opacity-40"
          >
            {submitting ? "Raising…" : "Raise request"}
          </button>
        </form>
        {msg && (
          <p className={`text-xs font-medium ${msg.ok ? "text-action-success" : "text-action-danger"}`}>{msg.text}</p>
        )}
      </section>

      {/* My requests */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">My requests</h2>
        {loading ? (
          <p className="text-xs text-text-muted">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-xs text-text-muted italic">No requests yet.</p>
        ) : (
          <ul className="space-y-2">
            {requests.map(r => (
              <li key={r.id} className="surface-card rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-text-primary truncate">{r.title}</span>
                  <StatusPill status={r.status} />
                </div>
                <div className="flex items-center gap-2 text-[10px] text-text-muted">
                  <span>{CATEGORIES.find(c => c.code === r.category_code)?.icon} {r.category_code}</span>
                  {r.priority === "urgent" && <span className="text-action-warning font-semibold">URGENT</span>}
                  {r.assigned_role && <span>→ {r.assigned_role}</span>}
                  <span className="ml-auto">{new Date(r.created_at).toLocaleDateString("en-IN")}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-sky-500/10 text-sky-600 border-sky-500/30",
    in_progress: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    escalated: "bg-rose-500/10 text-rose-600 border-rose-500/30",
    resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    closed: "bg-text-muted/10 text-text-muted border-border",
  };
  const label: Record<string, string> = {
    open: "Open", in_progress: "In progress", escalated: "Escalated", resolved: "Resolved", closed: "Closed",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${map[status] ?? map.open}`}>
      {label[status] ?? status}
    </span>
  );
}
