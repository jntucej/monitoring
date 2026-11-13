"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

import { UserProfileTab } from "@/components/shared/UserProfileTab";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";

interface DataResponse {
  success: boolean;
  data: unknown;
  total?: number;
}

function StaffMyProfileInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "Staff") as Role;
  const tier = getRoleTier(role);

  const {


    error,
    refresh,
  } = useApiResource<DataResponse>("/api/profile", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 overflow-x-hidden space-y-6 px-4 py-6 md:px-6">
      <Link
        href="/staff"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Staff Overview
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-text-muted min-w-0">
            Signed in as <span className="font-mono text-text-secondary">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">My Profile data unavailable: {error}</span>
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

      <WidgetBoundary title="My Profile">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="p-4 min-w-0">
            <UserProfileTab />
          </div>
        </div>
      </WidgetBoundary>

    </div>
  );
}

export default function StaffMyProfilePage() {
  return (
    <AuthGuard allowedRoles={["staff", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <StaffMyProfileInner />
      </Suspense>
    </AuthGuard>
  );
}
