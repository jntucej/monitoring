"use client";
// src/app/(student)/student/coordinator/page.tsx
// Coordinator (class-CR) surface: duties card, relay inbox (release buttons),
// collect-a-concern form, and read-only view of the class's open requests.
// Only meaningful when the user has an active student_representatives row.

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { getAuthHeaders } from "@/lib/utils";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

interface Coordinator {
  id: string;
  studentId: string;
  scopeId: string;
  appointmentType: string;
  validTo: string;
  name: string;
}
interface RelayMsg {
  id: string;
  body: string;
  urgency: string;
  auto_release_at: string | null;
  requires_ack: boolean;
}
interface OpenRequest {
  id: string;
  category_code: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
}

export default function CoordinatorPage() {
  const user = useAuthStore(s => s.user);
  const [isCoord, setIsCoord] = useState<boolean | null>(null);
  const [scopeId, setScopeId] = useState<string | null>(null);
  const [relayInbox, setRelayInbox] = useState<RelayMsg[]>([]);
  const [openReqs, setOpenReqs] = useState<OpenRequest[]>([]);
  const [collectTitle, setCollectTitle] = useState("");
  const [collectBody, setCollectBody] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Is this user an active coordinator?
  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/class-coordinators", { headers: getAuthHeaders(), cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        const me: Coordinator[] = (d.data ?? []).filter((c: Coordinator) => c.studentId === user.id);
        if (me.length > 0) { setIsCoord(true); setScopeId(me[0].scopeId); }
        else setIsCoord(false);
      })
      .catch(() => setIsCoord(false));
  }, [user?.id]);

  // Relay inbox: unreleased relay messages naming this coordinator.
  const loadInbox = useCallback(async () => {
    if (!user?.id || !scopeId) return;
    const res = await fetch("/api/class-messages?pendingRelay=1", { headers: getAuthHeaders(), cache: "no-store" });
    const d = await res.json();
    if (d.success) setRelayInbox((d.data ?? []).filter((m: RelayMsg) => m.urgency || m.body));
  }, [user?.id, scopeId]);

  // Class's open requests (read-only, D3).
  const loadReqs = useCallback(async () => {
    if (!user?.id || !scopeId) return;
    const res = await fetch(`/api/class-requests?queue=class&classId=${encodeURIComponent(scopeId)}`, { headers: getAuthHeaders(), cache: "no-store" });
    const d = await res.json();
    if (d.success) setOpenReqs(d.data ?? []);
  }, [user?.id, scopeId]);

  useEffect(() => { void loadInbox(); void loadReqs(); }, [loadInbox, loadReqs]);

  if (isCoord === null) return <p className="text-xs text-text-muted p-2.5">Checking coordinator status…</p>;
  if (!isCoord) return (
    <div className="p-2.5 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-text-primary">Class Coordinator Portal</h1>
      <p className="text-sm text-text-muted mt-2">
        You are not currently appointed as a class coordinator. This page is for students appointed
        as a Class Representative (CR) or In-Charge Representative (ICR). Ask your Head of Department (HOD) or class teacher to appoint you.
      </p>
    </div>
  );

  async function release(id: string) {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/class-messages/${id}/release`, { method: "POST", headers: getAuthHeaders(), body: "{}" });
      const d = await res.json();
      setMsg(d.success ? { ok: true, text: "Notice released to the class." } : { ok: false, text: d.error?.message ?? "Release failed." });
      void loadInbox();
    } catch { setMsg({ ok: false, text: "Network error." }); }
    setBusy(false);
  }

  async function collect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/class-requests", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ classId: scopeId, category: "FACULTY", title: collectTitle, body: collectBody, raisedByRep: true, priority: "normal" }),
      });
      const d = await res.json();
      setMsg(d.success ? { ok: true, text: "Concern raised on behalf of the class." } : { ok: false, text: d.error?.message ?? "Could not raise the concern." });
      setCollectTitle(""); setCollectBody("");
      void loadReqs();
    } catch { setMsg({ ok: false, text: "Network error." }); }
    setBusy(false);
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <header>
        <h1 className="text-lg font-bold text-text-primary">Coordinator</h1>
        <p className="text-xs text-text-muted mt-1">Class {scopeId} · appointed</p>
      </header>

      <ContextSituationBar
        roleLabel="Student Representative"
        purpose="Release class announcements, triage batch concerns, and coordinate with faculty"
        contextLabel="Class Representative Desk"
        severity={relayInbox.length > 0 ? "warn" : "ok"}
        statusPill={relayInbox.length > 0 ? `${relayInbox.length} pending release` : "Inbox clear"}
        statusSummary={
          relayInbox.length > 0
            ? `${relayInbox.length} announcement${relayInbox.length === 1 ? "" : "s"} waiting for your approval to broadcast to the class.`
            : `Active CR for class ${scopeId}. Review relay messages or submit batch concerns.`
        }
        primaryAction={{ label: "Class Requests", href: "/student/class-requests" }}
        secondaryAction={{ label: "Student Home", href: "/student" }}
      />

      {msg && <p className={`text-xs font-medium ${msg.ok ? "text-action-success" : "text-action-danger"}`}>{msg.text}</p>}

      {/* Relay inbox */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Relay inbox</h2>
        {relayInbox.length === 0 ? (
          <p className="text-xs text-text-muted italic">No notices awaiting your release.</p>
        ) : (
          <ul className="space-y-2">
            {relayInbox.map(m => (
              <li key={m.id} className="space-y-2">
                <p className="text-sm text-text-primary whitespace-pre-wrap">{m.body}</p>
                <div className="flex items-center gap-2">
                  {m.urgency === "urgent" && <span className="text-[10px] font-semibold text-action-warning">URGENT</span>}
                  {m.auto_release_at && <span className="text-[10px] text-text-muted">auto-release {new Date(m.auto_release_at).toLocaleString("en-IN")}</span>}
                  <button
                    onClick={() => release(m.id)}
                    disabled={busy}
                    className="ml-auto rounded-lg bg-action-primary text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-40"
                  >
                    Release
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Collect a concern */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Collect a concern</h2>
        <p className="text-xs text-text-muted">Raise a signed collective issue on behalf of the batch.</p>
        <form onSubmit={collect} className="space-y-2">
          <input
            value={collectTitle}
            onChange={e => setCollectTitle(e.target.value)}
            maxLength={120}
            required
            placeholder="Short title"
            className="w-full p-2.5 bg-bg-base border border-border text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
          />
          <textarea
            value={collectBody}
            onChange={e => setCollectBody(e.target.value)}
            rows={2}
            placeholder="What is the class's concern?"
            className="w-full p-2.5 bg-bg-base border border-border text-sm text-text-primary resize-none focus:outline-none focus:ring-1 focus:ring-action-primary"
          />
          <button type="submit" disabled={busy || !collectTitle.trim()}
            className="rounded-lg bg-action-primary text-white text-sm font-semibold px-4 py-2 disabled:opacity-40">
            Raise concern
          </button>
        </form>
      </section>

      {/* Class's open requests (read-only) */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Class open requests</h2>
        {openReqs.length === 0 ? (
          <p className="text-xs text-text-muted italic">No open requests.</p>
        ) : (
          <ul className="space-y-1.5">
            {openReqs.map(r => (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <span className="text-xs text-text-primary truncate">{r.title}</span>
                <span className="text-[10px] text-text-muted shrink-0">{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
