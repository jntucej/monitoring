"use client";

/**
 * Communities — moderated discussion communities widget.
 *
 * Lists the campus communities with join/leave controls; the selected
 * community shows its approved posts (with a "pending moderation" hint
 * on the caller's own pending posts), a post composer (disabled for
 * non-members), a per-post report/flag control, and a moderate menu
 * (approve / hide / unhide) that is visible only to moderators/admins.
 *
 * All data comes from /api/campus/communities/* (server-authorized);
 * pending/hidden posts are readable only by their author or a
 * moderator/admin — enforced in the API, not in this component.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  UserMinus,
  MessageSquarePlus,
  Flag,
  ShieldCheck,
  EyeOff,
  Check,
  Clock,
  Inbox,
  Loader2,
  BrainCircuit,
  Shield,
  Code,
  Bot,
  Rocket,
  Dumbbell,
  HeartHandshake,
  Plus,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

type MembershipRole = "member" | "moderator" | "admin";

interface Community {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  isModerated: boolean;
  memberCount: number;
  isMember: boolean;
  myRole: MembershipRole | null;
  canModerate: boolean;
}

interface CommunityPost {
  id: string;
  title: string;
  body: string;
  status: "pending" | "approved" | "hidden";
  author: string;
  reportedCount: number;
  isOwn: boolean;
  createdAt: string | null;
}

interface PostsData {
  isMember: boolean;
  myRole: MembershipRole | null;
  canModerate: boolean;
  posts: CommunityPost[];
}

const COMMUNITY_ICONS: Record<string, typeof Users> = {
  brain: BrainCircuit,
  braincircuit: BrainCircuit,
  "brain-circuit": BrainCircuit,
  shield: Shield,
  code: Code,
  bot: Bot,
  rocket: Rocket,
  dumbbell: Dumbbell,
  "heart-handshake": HeartHandshake,
};

function iconFor(name: string | null, fallback: string | null): typeof Users {
  const key = (name ?? fallback ?? "").toLowerCase().replace(/[\s-]+/g, "");
  return COMMUNITY_ICONS[key] ?? Users;
}

function communityFetch<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; json: T | null }> {
  return fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...getAuthHeaders(), ...(init?.headers ?? {}) },
    cache: "no-store",
  }).then(async (res) => ({
    ok: res.ok,
    status: res.status,
    json: await res.json().catch(() => null),
  }));
}

interface CommunityResponse {
  success: boolean;
  data?: { communities: Community[] };
  error?: { message?: string };
}

interface PostsResponse {
  success: boolean;
  data?: PostsData;
  error?: { message?: string };
}

interface ActionResponse {
  success: boolean;
  data?: { status?: string };
  error?: { message?: string };
}

function formatWhen(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function Communities() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selected, setSelected] = useState<Community | null>(null);
  const [posts, setPosts] = useState<PostsData | null>(null);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [reportReason, setReportReason] = useState<Record<string, string>>({});
  const [reportTarget, setReportTarget] = useState<string | null>(null);

  const loadCommunities = useCallback(async () => {
    try {
      setLoadingCommunities(true);
      const { ok, json } = await communityFetch<CommunityResponse>("/api/campus/communities");
      if (!ok || !json?.success) {
        throw new Error(json?.error?.message ?? "Failed to load communities");
      }
      setCommunities(json.data?.communities ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load communities");
    } finally {
      setLoadingCommunities(false);
    }
  }, []);

  const loadPosts = useCallback(
    async (communityId: string) => {
      try {
        setLoadingPosts(true);
        const { ok, json } = await communityFetch<PostsResponse>(
          `/api/campus/communities/${encodeURIComponent(communityId)}/posts`
        );
        if (!ok || !json?.success) {
          throw new Error(json?.error?.message ?? "Failed to load posts");
        }
        setPosts(json.data ?? null);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load posts");
      } finally {
        setLoadingPosts(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadCommunities();
  }, [loadCommunities]);

  useEffect(() => {
    if (selected) {
      void loadPosts(selected.id);
      setComposerOpen(false);
      setTitle("");
      setText("");
    } else {
      setPosts(null);
    }
  }, [selected, loadPosts]);

  async function runCommunityAction(fn: () => Promise<{ ok: boolean; status: number; json: ActionResponse | null }>, doneMsg: string) {
    setAction(doneMsg);
    const res = await fn();
    setAction(null);
    if (!res.ok) {
      setError(res.json?.error?.message ?? "Action failed");
      return;
    }
    void loadCommunities();
    if (selected) void loadPosts(selected.id);
  }

  const join = () => {
    if (!selected) return;
    void runCommunityAction(
      () => communityFetch<ActionResponse>(`/api/campus/communities/${encodeURIComponent(selected.id)}/join`, { method: "POST" }),
      "Joining…"
    );
  };

  const leave = () => {
    if (!selected) return;
    void runCommunityAction(
      () =>
        communityFetch<ActionResponse>(
          `/api/campus/communities/${encodeURIComponent(selected.id)}/leave`,
          { method: "POST" }
        ),
      "Leaving…"
    );
  };

  const createPost = async () => {
    if (!selected || !title.trim() || !text.trim()) return;
    const res = await communityFetch<ActionResponse>(`/api/campus/communities/${encodeURIComponent(selected.id)}/posts`, {
      method: "POST",
      body: JSON.stringify({ title: title.trim(), body: text.trim() }),
    });
    if (!res.ok) {
      setError(res.json?.error?.message ?? "Could not post");
      return;
    }
    setTitle("");
    setText("");
    setComposerOpen(false);
    void loadPosts(selected.id);
  };

  const moderate = async (postId: string, modAction: "approve" | "hide" | "unhide") => {
    if (!selected) return;
    const res = await communityFetch<ActionResponse>(`/api/campus/communities/${encodeURIComponent(selected.id)}/moderate`, {
      method: "POST",
      body: JSON.stringify({ postId, action: modAction }),
    });
    if (!res.ok) {
      setError(res.json?.error?.message ?? "Moderation failed");
      return;
    }
    void loadPosts(selected.id);
  };

  const report = async (postId: string) => {
    if (!selected) return;
    const reason = (reportReason[postId] ?? "").trim();
    if (!reason) return;
    const res = await communityFetch<ActionResponse>(`/api/campus/communities/${encodeURIComponent(selected.id)}/report`, {
      method: "POST",
      body: JSON.stringify({ postId, reason }),
    });
    if (!res.ok) {
      setError(res.json?.error?.message ?? "Could not report");
      return;
    }
    setReportReason((r) => ({ ...r, [postId]: "" }));
    setReportTarget(null);
    void loadPosts(selected.id);
  };

  const selectedData = selected ? posts : null;
  const canModerateSelected = selectedData?.canModerate ?? false;
  const canCompose = Boolean(selected?.isMember || canModerateSelected);

  return (
    <WidgetBoundary title="Communities">
      <section aria-label="Campus communities" className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <Users className="h-4 w-4 text-violet-400" aria-hidden />
            Communities
          </h2>
          <p className="text-[10px] text-[var(--text-muted)]">
            All communities are moderated — new posts await review
          </p>
        </div>

        {loadingCommunities && communities.length === 0 ? (
          <div className="mt-6 flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]" role="status">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
            Loading communities…
          </div>
        ) : error && communities.length === 0 ? (
          <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>
        ) : communities.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center text-[var(--text-muted)]">
            <Inbox className="h-6 w-6 opacity-50" aria-hidden />
            <p className="text-sm">No communities yet — administrators can create one.</p>
          </div>
        ) : (
          <>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Choose a community">
              {communities.map((c) => {
                const Icon = iconFor(c.icon, c.name);
                const active = selected?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelected(active ? null : c)}
                    className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors motion-reduce:transition-none ${
                      active
                        ? "border-violet-500/50 bg-violet-500/15"
                        : "border-[var(--border)] bg-[var(--bg-raised)]/30 hover:bg-[var(--bg-raised)]/60"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-violet-300" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-[var(--text-primary)]">{c.name}</span>
                      <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                        <Users className="h-3 w-3" aria-hidden />
                        {c.memberCount}
                        {c.isMember && (
                          <span className="ml-1 rounded-full bg-violet-500/20 px-1.5 text-[9px] font-semibold text-violet-300">
                            {c.myRole ?? "member"}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {selected ? (
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-raised)]/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-[var(--text-primary)]">{selected.name}</h3>
                    {selected.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">{selected.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {action && (
                      <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                        <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden />
                        {action}
                      </span>
                    )}
                    {selected.isMember ? (
                      <button
                        type="button"
                        onClick={() => void leave()}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-rose-300 motion-safe:transition-colors motion-reduce:transition-none disabled:opacity-50"
                      >
                        <UserMinus className="h-3.5 w-3.5" aria-hidden />
                        Leave
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void join()}
                        className="inline-flex items-center gap-1 rounded-lg border border-violet-500/40 bg-violet-500/15 px-2.5 py-1 text-[11px] font-semibold text-violet-300 hover:bg-violet-500/25 motion-safe:transition-colors motion-reduce:transition-none disabled:opacity-50"
                      >
                        <UserPlus className="h-3.5 w-3.5" aria-hidden />
                        Join
                      </button>
                    )}
                  </div>
                </div>

                {canCompose ? (
                  <div className="mt-3">
                    {composerOpen ? (
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
                        <input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Title"
                          aria-label="Post title"
                          maxLength={200}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-raised)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-violet-500/50"
                        />
                        <textarea
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          placeholder="Share something with the community…"
                          aria-label="Post body"
                          rows={3}
                          maxLength={5000}
                          className="mt-2 w-full resize-y rounded-md border border-[var(--border)] bg-[var(--bg-raised)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-violet-500/50"
                        />
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {canModerateSelected ? "Posts publish immediately." : "Your post will be reviewed by moderators."}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setComposerOpen(false)}
                              className="rounded-md border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-muted)]"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => void createPost()}
                              disabled={!title.trim() || !text.trim()}
                              className="inline-flex items-center gap-1 rounded-md border border-violet-500/40 bg-violet-500/15 px-2 py-1 text-[11px] font-semibold text-violet-300 disabled:opacity-40"
                            >
                              <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
                              Post
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setComposerOpen(true)}
                        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)]/60 px-3 py-2.5 text-xs text-[var(--text-muted)] hover:border-violet-500/40 hover:text-[var(--text-primary)] motion-safe:transition-colors motion-reduce:transition-none"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                        Start a discussion in {selected.name}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/50 px-3 py-2.5 text-[11px] text-[var(--text-muted)]">
                    Join {selected.name} to start a discussion.
                  </p>
                )}

                {loadingPosts ? (
                  <div className="mt-4 flex items-center gap-2 py-4 text-xs text-[var(--text-muted)]" role="status">
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
                    Loading posts…
                  </div>
                ) : selectedData && selectedData.posts.length === 0 ? (
                  <p className="mt-4 flex items-center gap-2 py-2 text-xs text-[var(--text-muted)]">
                    <Inbox className="h-4 w-4 opacity-50" aria-hidden />
                    No posts here yet.
                  </p>
                ) : selectedData ? (
                  <ul className="mt-4 space-y-2.5" aria-label="Community posts">
                    {selectedData.posts.map((p) => {
                      const showModerateMenu = canModerateSelected;
                      const pendingHint = p.status === "pending" && (p.isOwn || canModerateSelected);
                      const hiddenHint = p.status === "hidden" && (p.isOwn || canModerateSelected);
                      return (
                        <li key={p.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{p.title}</p>
                              <p className="mt-1 line-clamp-3 text-[11px] text-[var(--text-muted)]">{p.body}</p>
                              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                                <span className="font-medium text-[var(--text-primary)]">{p.author}</span>
                                <span aria-hidden>·</span>
                                <Clock className="h-3 w-3" aria-hidden />
                                {formatWhen(p.createdAt) ?? "recently"}
                                {p.isOwn && pendingHint && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-300">
                                    <ShieldCheck className="h-3 w-3" aria-hidden />
                                    pending moderation
                                  </span>
                                )}
                                {hiddenHint && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 font-semibold text-rose-300">
                                    <EyeOff className="h-3 w-3" aria-hidden />
                                    hidden
                                  </span>
                                )}
                              </p>
                            </div>
                            {showModerateMenu && (
                              <div className="flex shrink-0 items-center gap-1" role="menu" aria-label={`Moderate ${p.title}`}>
                                {p.status !== "approved" && (
                                  <button
                                    type="button"
                                    onClick={() => void moderate(p.id, "approve")}
                                    title="Approve post"
                                    className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/25"
                                  >
                                    <Check className="h-3 w-3" aria-hidden />
                                    Approve
                                  </button>
                                )}
                                {p.status !== "hidden" && (
                                  <button
                                    type="button"
                                    onClick={() => void moderate(p.id, "hide")}
                                    title="Hide post"
                                    className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/15 px-2 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-500/25"
                                  >
                                    <EyeOff className="h-3 w-3" aria-hidden />
                                    Hide
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {reportTarget === p.id ? (
                              <div className="flex w-full items-center gap-1.5">
                                <input
                                  value={reportReason[p.id] ?? ""}
                                  onChange={(e) => setReportReason((r) => ({ ...r, [p.id]: e.target.value }))}
                                  placeholder="Why is this post a problem?"
                                  aria-label="Report reason"
                                  maxLength={500}
                                  className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-raised)] px-2 py-1 text-[11px] text-[var(--text-primary)] outline-none focus:border-rose-500/50"
                                />
                                <button
                                  type="button"
                                  onClick={() => void report(p.id)}
                                  disabled={!(reportReason[p.id] ?? "").trim()}
                                  className="rounded-md border border-rose-500/40 bg-rose-500/15 px-2 py-1 text-[10px] font-semibold text-rose-300 disabled:opacity-40"
                                >
                                  Send
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReportTarget(null)}
                                  className="rounded-md border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text-muted)]"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setReportTarget(p.id)}
                                disabled={!selectedData.isMember}
                                className="inline-flex items-center gap-1 rounded-md border border-transparent px-1.5 py-1 text-[10px] text-[var(--text-muted)] hover:text-rose-300 disabled:opacity-30"
                              >
                                <Flag className="h-3 w-3" aria-hidden />
                                Report
                                {p.reportedCount > 0 ? ` (${p.reportedCount})` : ""}
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-xs text-[var(--text-muted)]">Select a community above to view its discussions.</p>
            )}
          </>
        )}
      </section>
    </WidgetBoundary>
  );
}
