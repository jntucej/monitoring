"use client";

import React, { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { AdminSidebar, type AdminOverviewPayload } from "@/components/admin/AdminSidebar";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
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

  // Close the mobile drawer on route change + Esc. Lock body scroll while open.
  const pathname = usePathname();
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // Close the drawer on any route change (covers router.back / child nav that
  // doesn't go through a sidebar <Link>).
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const main = (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">{children}</div>
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
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
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

            {/* Scrim + off-canvas drawer */}
            {mobileOpen && (
              <div className="fixed inset-0 z-50 md:hidden">
                <div
                  className="absolute inset-0 bg-black/50"
                  onClick={closeMobile}
                  aria-hidden="true"
                />
                <div
                  className={cn(
                    "absolute right-0 top-0 h-full w-[85%] max-w-xs shadow-2xl",
                    "bg-[var(--bg-surface)]"
                  )}
                  role="dialog"
                  aria-label="Navigation"
                >
                  <div className="flex items-center justify-end p-2">
                    <button
                      type="button"
                      onClick={closeMobile}
                      aria-label="Close navigation"
                      className="inline-flex items-center justify-center rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {/* Drawer reuses the same manifest rail; force expanded so
                      labels are readable in the off-canvas panel. */}
                  <div className="h-[calc(100%-3rem)] overflow-y-auto">
                    <AdminSidebar
                      overview={overview}
                      forceExpanded
                      onNavigate={closeMobile}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </React.Suspense>
    </AuthGuard>
  );
}
