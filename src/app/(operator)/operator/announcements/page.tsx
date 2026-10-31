"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { OperatorWidgetBoundary } from "@/components/operator/shared/OperatorWidgetBoundary";
import { OperatorPageLoading } from "@/components/operator/shared/OperatorLoading";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";
import {
  Loader2,
  Megaphone,
  Calendar,
  Clock,
  AlertTriangle,
  Inbox,
} from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body?: string;
  audience?: string;
  expires_at?: string;
  created_at?: string;
}

function OperatorAnnouncementsInner() {
  const user = useAuthStore((s) => s.user);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/announcements/active", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setAnnouncements(json.data || []);
      } else {
        setError(json.error?.message || "Could not load announcements");
        setAnnouncements([]);
      }
    } catch {
      setError("Network error");
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAnnouncements(); }, [loadAnnouncements]);
  usePolling(loadAnnouncements, { intervalMs: 60_000, enabled: !!user });

  const fmtDate = (iso: string | undefined) =>
    iso ? new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5 py-6 min-w-0">
      <div className="flex items-center justify-between min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Megaphone className="w-5 h-5 text-[var(--action-primary)] shrink-0" />
            <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">Announcements</h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1 min-w-0">
            Active campus announcements visible to your role.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAnnouncements()}
          disabled={loading}
          className="min-h-[44px] inline-flex items-center justify-center rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition shrink-0 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Loading</span>
          ) : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      <OperatorWidgetBoundary title="Active Announcements">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden min-w-0">
          {loading ? (
            <div className="p-6 flex items-center justify-center text-sm text-[var(--text-muted)] min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none mr-2 shrink-0" />
              Loading announcements…
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-8 text-center min-w-0">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-[var(--text-muted)]">No active announcements at this time.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)] min-w-0">
              {announcements.map((a) => (
                <li key={a.id} className="px-4 py-4 min-w-0">
                  <div className="flex items-start gap-3 min-w-0">
                    <Megaphone className="w-4 h-4 text-[var(--action-primary)] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{a.title}</p>
                      {a.body && <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-3">{a.body}</p>}
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-muted)]">
                        {a.audience && (
                          <span className="rounded-full border border-[var(--border)] px-1.5 py-0.5 uppercase">
                            {a.audience}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {fmtDate(a.created_at)}
                        </span>
                        {a.expires_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expires {fmtDate(a.expires_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </OperatorWidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function OperatorAnnouncementsPage() {
  return (
    <Suspense fallback={<OperatorPageLoading />}>
      <OperatorAnnouncementsInner />
    </Suspense>
  );
}
