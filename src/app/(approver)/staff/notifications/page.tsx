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
import { Loader2, Bell, AlertTriangle, ArrowRight } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import type { StaffMyDayResponse } from "../types";

interface NotificationRow {
  id: string;
  title: string | null;
  body: string | null;
  type: string | null;
  read: boolean;
  created_at: string | null;
}

interface NotifResponse {
  success: boolean;
  data: NotificationRow[];
}

function StaffNotificationsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "staff") as Role;
  const tier = getRoleTier(role);

  const profileUrl = user?.id
    ? `/api/notifications?type=${encodeURIComponent(role)}&id=${encodeURIComponent(user.id)}`
    : null;

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<NotifResponse>(profileUrl ?? "/api/staff/my-day", {
    ttlMs: 30_000,
    enabled: !!profileUrl,
  });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const notifs = Array.isArray(data?.data) ? data.data : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      <Link
        href="/staff"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Staff Overview
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-white">Notifications</h1>
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
              <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">Your notifications</span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">{notifs.length} item(s)</span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading Notifications…
            </div>
          ) : notifs.length === 0 ? (
            <div className="p-4 min-w-0">
              <p className="text-sm text-slate-500">No notifications for your role.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800 min-w-0">
              {notifs.map((n) => (
                <div key={n.id} className="px-4 py-3 min-w-0">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">{n.title ?? "Notification"}</p>
                      {n.body && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-slate-500 capitalize">{n.type ?? "general"}</p>
                      {n.created_at && (
                        <p className="text-[11px] text-slate-500">
                          {new Date(n.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
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
export default function StaffNotificationsPage() {
  return (
    <AuthGuard allowedRoles={['staff', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <StaffNotificationsInner />
      </Suspense>
    </AuthGuard>
  );
}
