"use client";

import React, { useEffect, useState } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { Sidebar, type OverviewPayload } from "@/components/sysadmin/Sidebar";
import type { Role } from "@/lib/types";

/**
 * SysAdmin console layout — the new Sidebar shell.
 *
 * The old RoleConsole chrome (IconRail + Board feed + status/command bars) is
 * gone. The shell is now:
 *
 *   <AuthGuard allowedRoles={sysadmin|admin}>
 *     flex h-screen overflow-hidden
 *       <Sidebar overview={...} />   ← 11-category manifest rail (collapsible)
 *       <main flex-1 overflow-y-auto>
 *         <DevContactStrip />
 *         {children} in a centered max-w-7xl column
 *
 * The live overview payload (MFA, alerts, gates, health, …) is polled every
 * 30s here and threaded down to the sidebar so its per-category minis stay
 * live without each mini fetching on its own. Sub-pages (people/health/etc.)
 * keep their own fetches; this layout owns only the sidebar's data.
 */
const OVERVIEW_URL = "/api/admin/overview";
const OVERVIEW_POLL_MS = 30_000;

export default function SysadminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [overview, setOverview] = useState<OverviewPayload | null>(null);

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
    <AuthGuard allowedRoles={["sysadmin", "admin"] as Role[]}>
      <React.Suspense fallback={<PageLoading />}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar overview={overview} />
          <main className="flex-1 overflow-y-auto">
            <DevContactStrip />
            <div className="mx-auto max-w-7xl p-6">{children}</div>
          </main>
        </div>
      </React.Suspense>
    </AuthGuard>
  );
}
