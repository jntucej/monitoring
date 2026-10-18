"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import { AuthGuard } from "@/components/shared/AuthGuard";
import {
  ShieldCheck,
  Loader2,
  ArrowRight,
  AlertTriangle,
  Inbox
} from "lucide-react";

/* response shapes */

interface AnnouncementItem {
  id: string;
  title: string;
  body?: string;
  audience?: string;
  created_at?: string;
}

interface AnnouncementsResponse {
  success: boolean;
  data: AnnouncementItem[];
}

function FacultyNotificationsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "faculty") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<AnnouncementsResponse>("/api/announcements/active", { ttlMs: 30_000 });

  const announcements = data?.data ?? [];

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link */}
      <Link
        href="/faculty"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Faculty Overview
      </Link>

      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Notifications data unavailable: {error}</span>
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <WidgetBoundary title="Notifications">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">Notifications</span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">{announcements.length} active announcement(s)</span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading Notifications…
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No active campus announcements relevant to your role.</p>
            </div>
          ) : (
            <div className="space-y-2 p-4 min-w-0">
              {announcements.slice(0, 10).map((a) => (
                <div key={a.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                    <p className="text-sm font-semibold text-white min-w-0">{a.title}</p>
                    {a.created_at ? (
                      <span className="text-xs text-slate-500">
                        {new Date(a.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </span>
                    ) : null}
                  </div>
                  {a.body ? <p className="mt-1 text-xs text-slate-400">{a.body}</p> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}
export default function FacultyNotificationsPage() {
  return (
    <AuthGuard allowedRoles={['faculty', 'hod', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <FacultyNotificationsInner />
      </Suspense>
    </AuthGuard>
  );
}
