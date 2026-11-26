"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Check, Filter, MessageSquare, Send, ShieldAlert, Users } from "lucide-react";
import { useApi } from "@/hooks/useApi";

interface ChatGroup {
  slug: string;
  name: string;
  group_type: "class" | "hierarchy" | "shift" | "incident" | "custom";
  scope_key: string | null;
  announcement_only: boolean;
  member_role: string;
  unread_count: number;
  unnoted_count: number;
}

interface ChatMessage {
  id?: string;
  sender_kind: "user" | "agent" | "system";
  message_type: "text" | "circular_card" | "approval_card" | "status_card";
  body: string;
  ref_kind: string | null;
  ref_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  sender_name: string | null;
  sender_role: string | null;
  noted_at: string | null;
}

interface ClassDoubt {
  id?: string;
  topic: string;
  question: string;
  target_role: string;
  status: "submitted" | "routed" | "answered" | "closed";
  authority_reply: string | null;
  publish_to_class: boolean;
  created_at: string;
}

export default function GroupChatPage() {
  const api = useApi();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [filterMode, setFilterMode] = useState<"all" | "needs_action">("all");
  const [composer, setComposer] = useState("");
  const [doubts, setDoubts] = useState<ClassDoubt[]>([]);
  const [doubtTopic, setDoubtTopic] = useState("academic");
  const [doubtQuestion, setDoubtQuestion] = useState("");
  const [alsoAppliesTo, setAlsoAppliesTo] = useState("");
  const [announceSummary, setAnnounceSummary] = useState("");
  const [announceSubject, setAnnounceSubject] = useState("");
  const [announceRequireNoted, setAnnounceRequireNoted] = useState(true);
  const [announceNeedsApproval, setAnnounceNeedsApproval] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [sending, setSending] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const res = await api.get<{ groups: ChatGroup[] }>("/api/chat/groups");
      const list = res?.data?.groups ?? [];
      setGroups(list);
      if (!activeSlug && list.length > 0) {
        setActiveSlug(list[0].slug);
      }
    } finally {
      setLoadingGroups(false);
    }
  }, [api, activeSlug]);

  const loadMessages = useCallback(async (slug: string) => {
    const [msgRes, doubtRes] = await Promise.all([
      api.get<{ messages: ChatMessage[] }>(`/api/chat/groups/${encodeURIComponent(slug)}/messages`),
      api.get<{ doubts: ClassDoubt[] }>(`/api/chat/groups/${encodeURIComponent(slug)}/doubts`),
    ]);
    setMessages(msgRes?.data?.messages ?? []);
    setDoubts(doubtRes?.data?.doubts ?? []);
  }, [api]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (activeSlug) {
      loadMessages(activeSlug);
    }
  }, [activeSlug, loadMessages]);

  const activeGroup = useMemo(
    () => groups.find((g) => g.slug === activeSlug) ?? null,
    [groups, activeSlug],
  );

  const visibleMessages = useMemo(() => {
    if (filterMode === "all") return messages;
    return messages.filter(
      (m) => (m.message_type === "circular_card" || m.message_type === "approval_card") && !m.noted_at,
    );
  }, [messages, filterMode]);

  async function sendMessage(text: string) {
    if (!activeSlug || !text.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/api/chat/groups/${encodeURIComponent(activeSlug)}/messages`, {
        body: text.trim(),
        message_type: "text",
      });
      setComposer("");
      await loadMessages(activeSlug);
    } finally {
      setSending(false);
    }
  }

  async function markNoted(messageId?: string) {
    if (!messageId || !activeSlug) return;
    await api.post(`/api/chat/messages/${encodeURIComponent(messageId)}/noted`, {});
    await loadMessages(activeSlug);
    await loadGroups();
  }

  async function submitDoubt() {
    if (!activeSlug || !doubtQuestion.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/api/chat/groups/${encodeURIComponent(activeSlug)}/doubts`, {
        topic: doubtTopic,
        question: doubtQuestion.trim(),
      });
      setDoubtQuestion("");
      await loadMessages(activeSlug);
    } finally {
      setSending(false);
    }
  }

  async function routeDoubt(doubtId?: string) {
    if (!doubtId || !activeSlug) return;
    await api.post(`/api/chat/doubts/${encodeURIComponent(doubtId)}/route`, {});
    await loadMessages(activeSlug);
  }

  async function dispatchAnnouncement() {
    if (!activeSlug || !announceSummary.trim() || sending) return;
    setSending(true);
    try {
      const extraSlugs = alsoAppliesTo
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await api.post("/api/chat/announcements/dispatch", {
        target_group_slug: activeSlug,
        subject_code: announceSubject.trim() || null,
        summary: announceSummary.trim(),
        require_noted: announceRequireNoted,
        requires_senior_approval: announceNeedsApproval,
        also_applies_to: extraSlugs,
      });
      setAnnounceSummary("");
      await loadMessages(activeSlug);
    } finally {
      setSending(false);
    }
  }

  async function handleScanUpload(file: File | null) {
    if (!file || !activeSlug) return;
    setScanning(true);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const base64 = btoa(bin);
      const res = await api.post<{
        pre_announcement?: {
          summary?: string;
          subject_code?: string | null;
          require_noted?: boolean;
          requires_senior_approval?: boolean;
          also_applies_to?: string[];
        };
      }>("/api/circulars/ocr-classify", {
        base64,
        title: file.name,
        target_group_slug: activeSlug,
      });
      const pre = res?.data?.pre_announcement;
      if (pre) {
        if (pre.summary) setAnnounceSummary(pre.summary);
        if (pre.subject_code) setAnnounceSubject(pre.subject_code);
        if (typeof pre.require_noted === "boolean") setAnnounceRequireNoted(pre.require_noted);
        if (typeof pre.requires_senior_approval === "boolean") setAnnounceNeedsApproval(pre.requires_senior_approval);
        if (Array.isArray(pre.also_applies_to) && pre.also_applies_to.length > 0) {
          setAlsoAppliesTo(pre.also_applies_to.join(", "));
        }
      }
    } finally {
      setScanning(false);
    }
  }

  const groupedSections = useMemo(() => {
    return {
      cohort: groups.filter((g) => g.group_type === "class"),
      hierarchy: groups.filter((g) => g.group_type === "hierarchy"),
      operational: groups.filter((g) => g.group_type === "shift" || g.group_type === "incident" || g.group_type === "custom"),
    };
  }, [groups]);

  return (
    <div className="flex h-[calc(100dvh-2rem)] bg-bg-base text-text-primary">
      {/* Left Rail */}
      <aside className="w-72 shrink-0 border-r border-border-subtle bg-bg-surface p-3 overflow-y-auto space-y-4">
        <div className="flex items-center gap-2 px-1">
          <MessageSquare className="size-4 text-accent-primary" />
          <h1 className="text-sm font-semibold">Group Threads</h1>
        </div>

        {loadingGroups && <p className="text-xs text-text-secondary px-1">Loading groups...</p>}

        {[
          { label: "My Class / Cohort", items: groupedSections.cohort },
          { label: "My Hierarchy / Tier", items: groupedSections.hierarchy },
          { label: "Shift / Incident / Custom", items: groupedSections.operational },
        ].map((section) => (
          <div key={section.label} className="space-y-1">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              {section.label}
            </p>
            {section.items.length === 0 ? (
              <p className="px-2 py-1 text-xs text-text-secondary/70">No active threads</p>
            ) : (
              section.items.map((g) => (
                <button
                  key={g.slug}
                  type="button"
                  onClick={() => setActiveSlug(g.slug)}
                  className={`w-full flex items-center justify-between rounded-md px-2.5 py-2 text-left text-xs ${
                    activeSlug === g.slug ? "bg-accent-primary/15 text-accent-primary font-semibold" : "hover:bg-bg-elevated"
                  }`}
                >
                  <span className="truncate">{g.name}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    {g.unnoted_count > 0 && (
                      <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                        {g.unnoted_count} noted
                      </span>
                    )}
                    {g.unread_count > 0 && (
                      <span className="rounded-full bg-accent-primary px-1.5 py-0.5 text-[10px] text-white">
                        {g.unread_count}
                      </span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        ))}
      </aside>

      {/* Center Thread */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between border-b border-border-subtle bg-bg-surface px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">{activeGroup?.name ?? "Select a group"}</h2>
            {activeGroup?.scope_key && (
              <p className="text-[11px] text-text-secondary">Scope: {activeGroup.scope_key}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFilterMode((m) => (m === "all" ? "needs_action" : "all"))}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle px-2.5 py-1 text-xs hover:bg-bg-elevated"
          >
            <Filter className="size-3.5" />
            {filterMode === "all" ? "All Messages" : "Needs My Noted / Action"}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {visibleMessages.map((m, idx) => (
            <div
              key={m.id ?? `${m.created_at}-${idx}`}
              className={`rounded-lg border p-3 text-sm ${
                m.sender_kind === "agent"
                  ? "border-accent-primary/40 bg-accent-primary/5"
                  : "border-border-subtle bg-bg-surface"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                <span className="font-medium text-text-primary">
                  {m.sender_kind === "agent" ? "Role Agent" : m.sender_name ?? m.sender_role ?? "Member"}
                </span>
                <span>{new Date(m.created_at).toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap text-text-primary">{m.body}</p>

              {(m.message_type === "circular_card" || m.message_type === "approval_card") && (
                <div className="mt-2 flex items-center gap-2">
                  {m.noted_at ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                      <Check className="size-3.5" /> Noted
                    </span>
                  ) : (
                    m.id && (
                      <button
                        type="button"
                        onClick={() => markNoted(m.id)}
                        className="rounded-md bg-accent-primary px-2.5 py-1 text-xs font-medium text-white hover:opacity-95"
                      >
                        Mark Noted
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(composer);
          }}
          className="border-t border-border-subtle bg-bg-surface p-3 flex gap-2"
        >
          <input
            type="text"
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            placeholder="Message group or mention @agent..."
            className="flex-1 rounded-md border border-border-subtle bg-bg-base px-3 py-2 text-xs focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !composer.trim() || !activeSlug}
            className="rounded-md bg-accent-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            <Send className="size-4" />
          </button>
        </form>
      </main>

      {/* Right Context Drawer */}
      <aside className="hidden xl:flex w-72 shrink-0 flex-col border-l border-border-subtle bg-bg-surface p-4 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          <Users className="size-4" />
          <span>Thread Context</span>
        </div>
        <div className="rounded-lg border border-border-subtle bg-bg-base p-3 text-xs space-y-1.5">
          <p className="font-medium text-text-primary">{activeGroup?.name ?? "No group selected"}</p>
          <p className="text-text-secondary">Type: {activeGroup?.group_type ?? "—"}</p>
          <p className="text-text-secondary">Role: {activeGroup?.member_role ?? "—"}</p>
          {activeGroup?.announcement_only && (
            <p className="inline-flex items-center gap-1 text-amber-300">
              <ShieldAlert className="size-3.5" /> Announcement-only
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={!activeSlug || sending}
          onClick={() => sendMessage("@agent What is pending or unnoted in this group?")}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-accent-primary/40 bg-accent-primary/10 px-3 py-2 text-xs font-semibold text-accent-primary hover:bg-accent-primary/20 disabled:opacity-50"
        >
          <Bot className="size-4" />
          Check Group Pending
        </button>

        {/* Authority Bridge */}
        <div className="border-t border-border-subtle pt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Authority Bridge
          </p>
          <select
            value={doubtTopic}
            onChange={(e) => setDoubtTopic(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-bg-base px-2 py-1.5 text-xs"
          >
            <option value="academic">Academic (Faculty → HOD)</option>
            <option value="timetable">Timetable (Faculty → HOD)</option>
            <option value="exam">Exam (Exam Branch → OIE)</option>
            <option value="hostel">Hostel (Deputy Warden → Hostel Mgr)</option>
            <option value="curfew">Curfew (Deputy Warden → Hostel Mgr)</option>
            <option value="campus">Campus (Admin → VP → Principal)</option>
            <option value="policy">Policy (Admin → VP → Principal)</option>
          </select>
          <textarea
            rows={2}
            value={doubtQuestion}
            onChange={(e) => setDoubtQuestion(e.target.value)}
            placeholder="Submit a class doubt for authority routing..."
            className="w-full rounded-md border border-border-subtle bg-bg-base px-2 py-1.5 text-xs"
          />
          <input
            type="text"
            value={alsoAppliesTo}
            onChange={(e) => setAlsoAppliesTo(e.target.value)}
            placeholder="Also applies to (comma-separated slugs/classes)"
            className="w-full rounded-md border border-border-subtle bg-bg-base px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={!activeSlug || !doubtQuestion.trim() || sending}
            onClick={submitDoubt}
            className="w-full rounded-md bg-accent-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Submit Doubt
          </button>

          {/* Pre-Send Announcement Config */}
          <div className="border-t border-border-subtle pt-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Pre-Send Announcement
              </p>
              <label className="cursor-pointer text-[11px] font-medium text-accent-primary hover:underline">
                {scanning ? "Scanning..." : "Scan Notice"}
                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={(e) => handleScanUpload(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <input
              type="text"
              value={announceSubject}
              onChange={(e) => setAnnounceSubject(e.target.value)}
              placeholder="Subject code (optional, e.g. CS301)"
              className="w-full rounded-md border border-border-subtle bg-bg-base px-2 py-1 text-xs"
            />
            <textarea
              rows={2}
              value={announceSummary}
              onChange={(e) => setAnnounceSummary(e.target.value)}
              placeholder="Announcement summary..."
              className="w-full rounded-md border border-border-subtle bg-bg-base px-2 py-1 text-xs"
            />
            <label className="flex items-center gap-1.5 text-[11px] text-text-secondary">
              <input
                type="checkbox"
                checked={announceRequireNoted}
                onChange={(e) => setAnnounceRequireNoted(e.target.checked)}
              />
              Require &quot;Noted&quot; acknowledgment
            </label>
            <button
              type="button"
              disabled={!activeSlug || !announceSummary.trim() || sending}
              onClick={dispatchAnnouncement}
              className="w-full rounded-md border border-accent-primary/40 bg-accent-primary/15 px-3 py-1.5 text-xs font-semibold text-accent-primary disabled:opacity-50"
            >
              Confirm &amp; Announce
            </button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pt-1">
            {doubts.map((d, i) => (
              <div key={d.id ?? `${d.created_at}-${i}`} className="rounded-md border border-border-subtle bg-bg-base p-2 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-text-secondary">
                  <span>{d.topic} → {d.target_role}</span>
                  <span className="uppercase font-semibold">{d.status}</span>
                </div>
                <p className="text-text-primary">{d.question}</p>
                {d.authority_reply && (
                  <p className="text-emerald-400 text-[11px]">Reply: {d.authority_reply}</p>
                )}
                {d.status === "submitted" && d.id && (
                  <button
                    type="button"
                    onClick={() => routeDoubt(d.id)}
                    className="rounded border border-border-subtle px-2 py-0.5 text-[11px] hover:bg-bg-elevated"
                  >
                    Route to {d.target_role}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
