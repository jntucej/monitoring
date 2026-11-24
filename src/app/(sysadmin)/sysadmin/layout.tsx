"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PageLoading } from "@/components/shared/LoadingStates";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { MobileNavDrawer } from "@/components/shared/MobileNavDrawer";
import { ScrollEdgeBlue } from "@/components/shared/ScrollEdgeBlue";
import { GlobalEntityInspector } from "@/components/shared/GlobalEntityInspector";
import { Sidebar, type OverviewPayload } from "@/components/sysadmin/Sidebar";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);

  // Poll the aggregator; every successful refresh replaces the whole payload so
  // the sidebar minis + badges re-derive live. `json.data ?? null` because the
  // envelope is ok(payload) but we tolerate a bare payload too.
  useEffect(() => {
    let alive = true;


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
    const timer = setInterval(fetchOnce, OVERVIEW_POLL_MS);
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  // Close the mobile drawer on any route change.
  const pathname = usePathname();
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const main = (
    <ScrollEdgeBlue className="h-full">

      <div className="mx-auto max-w-7xl p-4 sm:p-6">{children}</div>
    </ScrollEdgeBlue>
  );

  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"] as Role[]}>
      <React.Suspense fallback={<PageLoading />}>
        <div className="relative flex h-dvh overflow-hidden bg-bg-base">
          {/* ── Desktop rail ─────────────────────────────────────────── */}
          <div className="hidden md:flex md:h-full">
            <Sidebar overview={overview} />
          </div>

          {/* ── Mobile floating nav trigger ──────────────────────────── */}
          <button
            ref={hamburgerRef}
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            className={cn(
              "md:hidden absolute left-3 top-3 z-30 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg",
              "border border-border bg-bg-surface/90 backdrop-blur",
              "text-text-muted hover:text-text-primary",
              "shadow-sm pt-safe"
            )}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* ── Single-mounted main content ──────────────────────────── */}
          <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto">
            <div className="hidden md:flex surface-card items-center justify-between gap-3 bg-bg-surface px-4 py-2 sm:px-6">
              <span className="text-xs font-semibold tracking-wide text-text-muted">
                JNTUH UCEJ · SysAdmin
              </span>
            </div>
            {main}
          </main>

          {/* ── Mobile off-canvas drawer ─────────────────────────────── */}
          <MobileNavDrawer
            open={mobileOpen}
            onClose={closeMobile}
            triggerRef={hamburgerRef}
            label="SysAdmin navigation"
          >
            <Sidebar overview={overview} forceExpanded onNavigate={closeMobile} />
          </MobileNavDrawer>
          <GlobalEntityInspector />
        </div>
      </React.Suspense>
    </AuthGuard>
  );
}
