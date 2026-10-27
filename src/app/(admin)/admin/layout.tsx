"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PageLoading } from "@/components/admin/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { MobileNavDrawer } from "@/components/shared/MobileNavDrawer";
import { AdminSidebar, type AdminOverviewPayload } from "@/components/admin/AdminSidebar";
import { ScrollEdgeBlue } from "@/components/shared/ScrollEdgeBlue";
import { Menu } from "lucide-react";
import { cn, getAuthHeaders } from "@/lib/utils";
import type { Role } from "@/lib/types";

/**
 * Admin console layout — the manifest-driven Sidebar shell (Phase 1 parity
 * with the sysadmin console) made fully responsive.
 *
 * Desktop (md+):
 *   <div flex h-screen overflow-hidden>
 *     <AdminSidebar />             ← fixed 16rem manifest rail
 *     <main flex-1 overflow-y-auto>
 *       {children} in a max-w-7xl column
 *
 * Mobile (<md):
 *   <div h-dvh overflow-hidden flex flex-col>
 *     <floating hamburger>        ← small nav trigger (no full-width band)
 *     <div flex-1 overflow-y-auto>
 *       {children}
 *     <AdminSidebar as a slide-in drawer (off-canvas, behind a scrim)>
 *
 * The live overview payload (gates, alerts, traffic, audit, occupancy, …) is
 * polled every 30s here and threaded down to the sidebar so its per-category
 * minis stay live without each mini fetching on its own.
 */
const OVERVIEW_URL = "/api/admin/overview";
const OVERVIEW_POLL_MS = 30_000;

export default function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [overview, setOverview] = useState<AdminOverviewPayload | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);

  // Poll the aggregator; every successful refresh replaces the whole payload so
  // the sidebar minis + badges re-derive live. `json.data ?? null` because the
  // envelope is ok(payload) but we tolerate a bare payload too.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    const fetchOnce = () => {
      fetch(OVERVIEW_URL, {
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
      })
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

  // Close the mobile drawer on route change + Esc. Lock body scroll while open.
  const pathname = usePathname();
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Close the drawer on any route change (covers router.back / child nav that
  // doesn't go through a sidebar <Link>).
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const main = (
    <ScrollEdgeBlue className="h-full">
      <div className="mx-auto max-w-7xl p-4 sm:p-6">{children}</div>
    </ScrollEdgeBlue>
  );

  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"] as Role[]}>
      <React.Suspense fallback={<PageLoading />}>
        <div className="h-dvh overflow-hidden bg-[var(--bg-base)]">
          {/* ── Desktop shell: fixed rail + scrollable main ───────────── */}
          <div className="hidden md:flex md:h-full">
            <AdminSidebar overview={overview} />
            <main className="flex-1 overflow-y-auto">{main}</main>
          </div>

          {/* ── Mobile shell: floating hamburger + scrollable main + drawer ─ */}
          <div className="relative flex h-full flex-col md:hidden">
            {/* Minimal floating nav trigger — no full-width header band, so the
                admin console never shows two stacked headers on mobile. */}
            <button
              ref={hamburgerRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              className={cn(
                "absolute left-3 top-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-lg",
                "border border-[var(--border)] bg-[var(--bg-surface)]/90 backdrop-blur",
                "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                "shadow-sm pt-safe"
              )}
            >
              <Menu className="h-5 w-5" />
            </button>

            <main className="flex-1 overflow-y-auto">{main}</main>

            {/* Left-anchored off-canvas drawer (shared component) */}
            <MobileNavDrawer
              open={mobileOpen}
              onClose={closeMobile}
              triggerRef={hamburgerRef}
              label="Admin navigation"
            >
              <AdminSidebar
                overview={overview}
                forceExpanded
                onNavigate={closeMobile}
              />
            </MobileNavDrawer>
          </div>
        </div>
      </React.Suspense>
    </AuthGuard>
  );
}
