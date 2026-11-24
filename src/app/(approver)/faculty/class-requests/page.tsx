"use client";
// src/app/(approver)/faculty/class-requests/page.tsx
// Faculty + HOD dashboard: "My class requests" queue, "Publish class notice"
// (direct or via-CR relay), and class-level issues raised in their class.

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { getAuthHeaders } from "@/lib/utils";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import {
  buildFacultyClassRequestInspection,
  buildFacultyClassIssueInspection,
} from "@/lib/role-registers/facultyInspections";
import {
  KVPairs,
  ActionRow,
  InspectorButton,
  type EntityInspection,
} from "@/components/shared/EntityInspector";

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

/** Build an EntityInspection for a class request row (faculty/HOD view). */
function buildClassRequestInspection(r: QueueRow): EntityInspection {
  const sections: EntityInspection["sections"] = [
    {
      title: "Overview",
      content: (
        <KVPairs
          items={[
            { label: "Student", value: r.student_name },
            { label: "Class", value: r.class_name ?? "—" },
            { label: "Category", value: r.category_code },
            { label: "Priority", value: r.priority },
            { label: "Status", value: r.status },
            { label: "Created", value: new Date(r.created_at).toLocaleString() },
          ]}
        />
      ),
    },
    {
      title: "Actions",
      content: (
        <ActionRow>
          <InspectorButton href="/faculty/class-requests" variant="ghost">
            All requests
          </InspectorButton>
        </ActionRow>
      ),
    },
  ];

  return {
    kind: "complaint",
    title: r.title,
    subtitle: `${r.student_name} · ${r.class_name ?? ""}`,
    status: <StatusBadge text={r.status} tone={r.status === "open" ? "warn" : "neutral"} />,
    sections,
    detailHref: "/faculty/class-requests",
    detailLabel: "All class requests",
  };
}

interface QueueRow {
  id: string;
  category_code: string;
  title: string;
  priority: string;
  status: string;
  student_name: string;
  class_name: string | null;
  created_at: string;
}
interface IssueRow {
  id: string;
  topic: string;
  status: string;
  class_name: string | null;
  request_ids: string[];
  created_at: string;
}

export default function FacultyClassRequestsPage() {
  const user = useAuthStore(s => s.user);
  const { inspection, inspect, closeInspection } = useEntityInspector();
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Publish form
  const [noticeBody, setNoticeBody] = useState("");
  const [mode, setMode] = useState<"direct" | "relay">("direct");
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const userId = user?.id;
  const userRole = user?.role;
  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [qRes, iRes] = await Promise.all([
        fetch(`/api/class-requests?status=open`, { headers: getAuthHeaders(), cache: "no-store" }),
        userRole === "hod" || userRole === "vice_principal"
          ? fetch("/api/class-level-issues", { headers: getAuthHeaders(), cache: "no-store" })
          : Promise.resolve(null),
      ]);
      const qd = await qRes.json();
      if (qd.success) setQueue(qd.data ?? []);
      if (iRes) {
        const id = await iRes.json();
        if (id.success) setIssues(id.data ?? []);
      }
    } catch { /* network */ }
    setLoading(false);
  }, [userId, userRole]);

  useEffect(() => { void load(); }, [load]);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    setMsg(null); setPublishing(true);
    try {
      const res = await fetch("/api/class-messages", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          body: noticeBody,
          classIds: user.departmentId ? [user.departmentId] : [],
          mode,
          urgency,
          requiresAck: urgency === "urgent",
        }),
      });
      const d = await res.json();
      if (d.success) {
        setMsg({ ok: true, text: mode === "direct" ? "Notice published to the class." : "Notice held for coordinator relay (auto-release as backstop)." });
        setNoticeBody("");
      } else {
        setMsg({ ok: false, text: d.error?.message ?? "Publish failed." });
      }
    } catch { setMsg({ ok: false, text: "Network error." }); }
    setPublishing(false);
  }

  async function resolveRequest(reqRow: QueueRow) {
    setMsg(null);
    const note = prompt("Resolution note:", "");
    if (!note) return;
    try {
      const res = await fetch(`/api/class-requests/${reqRow.id}/resolve`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ note }),
      });
      const d = await res.json();
      setMsg(d.success ? { ok: true, text: "Class request resolved." } : { ok: false, text: d.error?.message ?? "Resolve failed." });
      closeInspection();
      void load();
    } catch {
      setMsg({ ok: false, text: "Network error." });
    }
  }

  async function resolveIssue(issue: IssueRow) {
    setMsg(null);
    const resolution = prompt("Resolution note:", "");
    if (!resolution) return;
    const res = await fetch(`/api/class-level-issues/${issue.id}/resolve`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ resolution }),
    });
    const d = await res.json();
    setMsg(d.success ? { ok: true, text: "Issue resolved; linked requests flipped to resolved." } : { ok: false, text: d.error?.message ?? "Resolve failed." });
    closeInspection();
    void load();
  }

  const isHod = user?.role === "hod" || user?.role === "vice_principal" || user?.role === "admin" || user?.role === "sysadmin";

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-3xl mx-auto">
      <header>
        <h1 className="text-lg font-bold text-text-primary">Class requests</h1>
        <p className="text-xs text-text-muted mt-1">Requests routed to you{isHod ? " and class-level issues" : ""}.</p>
      </header>

      <ContextSituationBar
        roleLabel={isHod ? "HOD · Class Requests" : "Faculty · Class Requests"}
        purpose="Review student requests, broadcast class notices, and resolve classroom escalations."
        contextLabel="Request Queue"
        statusTone={queue.length > 0 ? "warn" : "ok"}
        statusPill={queue.length > 0 ? `${queue.length} pending` : "Queue clear"}
        statusSummary={
          queue.length > 0
            ? `${queue.length} open class request${queue.length === 1 ? "" : "s"} awaiting review.`
            : "No open requests routed to your class queue right now."
        }
        primaryAction={{ label: "Faculty Home", href: "/faculty" }}
        secondaryActions={[
          { label: "Permissions", href: "/faculty/permissions" },
          { label: "Request History", href: "/faculty/request-history" },
        ]}
      />

      {msg && <p className={`text-xs font-medium ${msg.ok ? "text-action-success" : "text-action-danger"}`}>{msg.text}</p>}

      {/* My queue */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">My queue</h2>
        {loading ? <p className="text-xs text-text-muted">Loading…</p> : queue.length === 0 ? (
          <p className="text-xs text-text-muted italic">No open requests routed to you.</p>
        ) : (
          <ul className="space-y-2">
            {queue.map(r => (
              <li
                key={r.id}
                onClick={() => inspect(buildFacultyClassRequestInspection(r, true, () => void resolveRequest(r)))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    inspect(buildFacultyClassRequestInspection(r, true, () => void resolveRequest(r)));
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Inspect request: ${r.title}`}
                className="surface-card rounded-lg p-3 space-y-1 cursor-pointer hover:bg-bg-elevated/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-text-primary truncate">{r.title}</span>
                  {r.priority === "urgent" && <span className="text-[10px] font-semibold text-action-warning shrink-0">URGENT</span>}
                </div>
                <div className="text-[10px] text-text-muted">
                  {r.student_name} · {r.class_name ?? "—"} · {new Date(r.created_at).toLocaleDateString("en-IN")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Publish a notice */}
      {user?.role === "faculty" || isHod ? (
        <section className="surface-card rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Publish class notice</h2>
          <form onSubmit={publish} className="space-y-2.5">
            <textarea
              value={noticeBody}
              onChange={e => setNoticeBody(e.target.value)}
              rows={2}
              required
              placeholder="Notice text"
              className="surface-card w-full p-2.5 bg-bg-base text-sm text-text-primary rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-action-primary"
            />
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5">
                <input type="radio" name="mode" checked={mode === "direct"} onChange={() => setMode("direct")} /> Direct
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="mode" checked={mode === "relay"} onChange={() => setMode("relay")} /> Via coordinator
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="urgency" checked={urgency === "normal"} onChange={() => setUrgency("normal")} /> Normal
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="urgency" checked={urgency === "urgent"} onChange={() => setUrgency("urgent")} /> Urgent
              </label>
            </div>
            <button type="submit" disabled={publishing || !noticeBody.trim()}
              className="rounded-lg bg-action-primary text-white text-sm font-semibold px-4 py-2 disabled:opacity-40">
              {publishing ? "Publishing…" : "Publish"}
            </button>
          </form>
        </section>
      ) : null}

      {/* Class-level issues (HOD/VP) */}
      {isHod ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Class-level issues</h2>
          {issues.length === 0 ? <p className="text-xs text-text-muted italic">No open class-level issues.</p> : (
            <ul className="space-y-2">
              {issues.map(i => (
                <li
                  key={i.id}
                  onClick={() => inspect(buildFacultyClassIssueInspection(i, isHod, () => void resolveIssue(i)))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      inspect(buildFacultyClassIssueInspection(i, isHod, () => void resolveIssue(i)));
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Inspect class issue: ${i.topic}`}
                  className="surface-card rounded-lg p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-bg-elevated/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
                >
                  <div>
                    <span className="text-sm font-medium text-text-primary">{i.topic}</span>
                    <span className="text-[10px] text-text-muted block">{i.class_name ?? "—"} · {i.request_ids?.length ?? 0} linked requests</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void resolveIssue(i);
                    }}
                    className="rounded-lg border border-border text-xs font-semibold px-3 py-1.5 hover:bg-bg-elevated"
                  >
                    Resolve
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </div>
  );
}
