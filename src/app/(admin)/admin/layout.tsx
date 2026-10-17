"use client";

import React, { useEffect, useState } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { AdminSidebar, type AdminOverviewPayload } from "@/components/admin/AdminSidebar";
import type { Role } from "@/lib/types";

/**
 * Admin console layout — the manifest-driven Sidebar shell (Phase 1 parity
 * with the sysadmin console).
 *
 * The old RoleConsole chrome (IconRail + Board feed + status/command bars) is
 * gone for the admin role. The shell is now:
 *
 *   <AuthGuard allowedRoles={admin|sysadmin}>
 *     flex h-screen overflow-hidden
 *       <AdminSidebar overview={...} />   ← 11-category manifest rail (collapsible)
 *       <main flex-1 overflow-y-auto>
 *         <DevContactStrip />
 *         {children} in a centered max-w-7xl column
 *
 * The live overview payload (gates, alerts, traffic, audit, occupancy, …) is
 * polled every 30s here and threaded down to the sidebar so its per-category
 * minis stay live without each mini fetching on its own. Sub-pages keep
 * their own fetches; this layout owns only the sidebar's data.
 */
const OVERVIEW_URL = "/api/admin/overview";
const OVERVIEW_POLL_MS = 30_000;

export default function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [overview, setOverview] = useState<AdminOverviewPayload | null>(null);

  // Poll the aggregator; every successful refresh replaces the whole payload so
  // the sidebar minis + badges re-derive live. `json.data ?? null` because the
  // envelope is ok(payload) but we tolerate a bare payload too.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    const fetchOnce = () => {
      fetch(OVERVIEW_URL, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (!alive || !json) return;
          setOverview(json.data ?? null);
        })
        .catch(() => {
          /* transient fetch errors are non-fatal for the shell */
        });
    };

    fetchOnce();
    timer = setInterval(fetchOnce, OVERVIEW_POLL_MS);
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"] as Role[]}>
      <React.Suspense fallback={<PageLoading />}>
        <div className="flex h-screen overflow-hidden">
          <AdminSidebar overview={overview} />
          <main className="flex-1 overflow-y-auto">
            <DevContactStrip />
            <div className="mx-auto max-w-7xl p-6">{children}</div>
          </main>
        </div>
      </React.Suspense>
    </AuthGuard>
  );
}
