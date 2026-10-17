"use client";

/**
 * AdminSidebar — the collapsible manifest-driven shell for the admin
 * console. Mirrors the sysadmin Sidebar exactly (collapse behavior,
 * per-category open state, live infographic minis, active-route
 * highlighting, badge counts) but reads from its own manifest so the IAs
 * can diverge.
 *
 * - Drives its tree of categories/pages from the admin IA manifest
 *   (packages/admin-console-kit/manifest/ia.json).
 * - Collapsible per-category (localStorage-persisted) plus a global
 *   collapsed / expanded mode (icon-only rail).
 * - Renders a live "infographic" mini next to each category header, driven
 *   by the manifest's `infographic` spec + a live overview payload polled at
 *   the layout level.
 * - Auto-expands the category that contains the current route and highlights
 *   the active page row with aria-current + a live count badge.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Shield,
  QrCode,
  MapPin,
  FileSpreadsheet,
  UtensilsCrossed,
  GraduationCap,
  Briefcase,
  HardHat,
  CalendarCheck,
  UserCog,
  Settings,
  SlidersHorizontal,
  Building2,
  GitBranch,
  Bell,
  BellRing,
  ScrollText,
  Activity,
  HelpCircle,
  Leaf,
  Menu,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  ArrowUpRight,
  BookOpen,
  Layers,
  Link2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminSidebarInfographic } from "./AdminSidebarInfographic";
import { ProfileMenuButton } from "@/components/shared/ProfileMenuButton";
import manifest from "../../../packages/admin-console-kit/manifest/ia.json";

// ── Admin overview payload shape (subset the infographic reads) ───────────
export interface AdminOverviewPayload {
  command?: { health: string[] };
  identity?: { active: number; suspended: number; deprovisioned: number };
  access?: { mfaCoverage: number };
  gates?: { status: string[] };
  monitoring?: { errorRate24h: number[] };
  alerts?: { critical: number; high: number; medium: number; low: number };
  automation?: { runs14d: number[] };
  data?: { backupFreshness: number };
  reference?: { departments: number; courses: number; sections: number };
  platform?: { envDrift: number; schemaDrift: number };
  governance?: { events7d: number[] };
  operations?: { traffic24h: number[] };
  analytics?: { traffic7d: number[] };
  counts?: Record<string, number>;
}

// ── Manifest shape (subset the sidebar consumes) ──────────────────────────
interface ManifestPage {
  label: string;
  href: string;
  icon?: string;
  exact?: boolean;
}

interface ManifestCategory {
  id: string;
  label: string;
  icon: string;
  role?: string;
  infographic?: { kind: string; source: string; color?: string };
  pages: ManifestPage[];
}

interface Manifest {
  version: number;
  defaultExpanded?: string;
  categories: ManifestCategory[];
  personal?: ManifestPage[];
}

const ia = manifest as unknown as Manifest;

// ── Icon registry (manifest "icon" string → component) ───────────────────
const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Shield,
  QrCode,
  MapPin,
  FileSpreadsheet,
  UtensilsCrossed,
  GraduationCap,
  Briefcase,
  HardHat,
  CalendarCheck,
  UserCog,
  Settings,
  SlidersHorizontal,
  Building2,
  GitBranch,
  Bell,
  BellRing,
  ScrollText,
  Activity,
  HelpCircle,
  Leaf,
  Menu,
  BookOpen,
  Layers,
  Link2,
};

function iconFor(name?: string): LucideIcon {
  return (name && ICONS[name]) || Activity;
}

// ── LocalStorage keys (namespaced to admin so it never collides with
// sysadmin's sidebar persistence) ─────────────────────────────────────────
const OPEN_KEY = "admin:sidebar:open";
const COLLAPSED_KEY = "admin:sidebar:collapsed";

function loadOpenState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(OPEN_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function loadCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

// ── Component ─────────────────────────────────────────────────────────────
export interface AdminSidebarProps {
  overview: AdminOverviewPayload | null;
  /** When true, force the rail to its expanded (label-visible) width and ignore
   *  the localStorage collapsed state. Used by the mobile off-canvas drawer,
   *  which is always wide enough to show labels. */
  forceExpanded?: boolean;
  /** Fire after any nav link is activated. The mobile drawer uses this to
   *  close itself on successful navigation. */
  onNavigate?: () => void;
}

export function AdminSidebar({ overview, forceExpanded, onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();

  const categories = useMemo(() => ia.categories, []);

  // Per-category open map. Hydrate from localStorage on mount; default to
  // "the manifest's defaultExpanded + all open" so the user sees every
  // category on first visit.
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [hydratedOpen, setHydratedOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hydratedCollapsed, setHydratedCollapsed] = useState(false);

  // Effective collapsed state: forceExpanded overrides the stored value.
  const isCollapsed = forceExpanded ? false : collapsed;

  useEffect(() => {
    setOpen((prev) => {
      const stored = loadOpenState();
      if (Object.keys(stored).length === 0) {
        const all: Record<string, boolean> = {};
        categories.forEach((c) => {
          all[c.id] = c.id === ia.defaultExpanded ? true : true;
        });
        return { ...all, ...prev };
      }
      const merged: Record<string, boolean> = { ...prev };
      categories.forEach((c) => {
        if (!(c.id in stored)) merged[c.id] = true;
        else merged[c.id] = stored[c.id];
      });
      return merged;
    });
    setHydratedOpen(true);
  }, [categories]);

  useEffect(() => {
    setCollapsed(loadCollapsed());
    setHydratedCollapsed(true);
  }, []);

  useEffect(() => {
    if (!hydratedOpen || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(OPEN_KEY, JSON.stringify(open));
    } catch {
      /* no-op */
    }
  }, [open, hydratedOpen]);

  useEffect(() => {
    if (!hydratedCollapsed || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* no-op */
    }
  }, [collapsed, hydratedCollapsed]);

  // Auto-expand the category that contains the current route.
  const containingCatId = useMemo(() => {
    const active = categories.find((c) =>
      c.pages.some((p) => {
        const url = p.href || "/admin";
        return pathname === url || pathname.startsWith(url + "/");
      })
    );
    return active?.id ?? null;
  }, [categories, pathname]);

  useEffect(() => {
    if (!hydratedOpen || !containingCatId) return;
    setOpen((prev) =>
      prev[containingCatId] ? prev : { ...prev, [containingCatId]: true }
    );
  }, [containingCatId, hydratedOpen]);

  const toggleCat = useCallback((id: string) => {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const collapseAll = useCallback(() => {
    setOpen((prev) => {
      const next: Record<string, boolean> = { ...prev };
      categories.forEach((c) => (next[c.id] = false));
      return next;
    });
  }, [categories]);

  const expandAll = useCallback(() => {
    setOpen((prev) => {
      const next: Record<string, boolean> = { ...prev };
      categories.forEach((c) => (next[c.id] = true));
      return next;
    });
  }, [categories]);

  const personalRoutes = useMemo(() => ia.personal ?? [], []);

  const widthClass = isCollapsed ? "w-16" : "w-64";

  return (
    <aside
      className={cn(
        "shrink-0 border-r border-[var(--border)] bg-[var(--bg-surface)] flex flex-col",
        widthClass,
        "transition-[width] duration-200"
      )}
      aria-label="Admin navigation"
    >
      {/* Top bar: brand + collapse toggle + expand/collapse all */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-[var(--border)]">
        <button
          type="button"
          onClick={() => (forceExpanded ? undefined : setCollapsed((v) => !v))}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
          className={cn(
            "inline-flex items-center justify-center rounded-md p-1.5",
            "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-primary)]",
            "transition-colors"
          )}
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <ChevronsDownUp className="h-4 w-4" />}
        </button>
        {!isCollapsed && (
          <>
            <button
              type="button"
              onClick={collapseAll}
              title="Collapse all"
              className="inline-flex items-center justify-center rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-primary)]"
            >
              <ChevronsDownUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={expandAll}
              title="Expand all"
              className="inline-flex items-center justify-center rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-primary)]"
            >
              <ChevronsUpDown className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {categories.map((cat) => {
          const Icon = iconFor(cat.icon);
          const isOpen = open[cat.id] ?? false;
          const isCollapsedInner = isCollapsed;

          if (isCollapsedInner) {
            return (
              <div key={cat.id} className="px-1 py-1">
                <Link
                  href={cat.pages[0]?.href ?? "/admin"}
                  aria-label={cat.label}
                  title={cat.label}
                  onClick={() => {
                    if (!forceExpanded) setCollapsed(false);
                    onNavigate?.();
                  }}
                  className="flex items-center justify-center rounded-md h-9 w-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                >
                  <Icon className="h-4 w-4" />
                </Link>
              </div>
            );
          }

          return (
            <div key={cat.id} className="select-none">
              <div className="flex items-center gap-1 px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => toggleCat(cat.id)}
                  aria-expanded={isOpen}
                  className="flex items-center gap-1.5 flex-1 min-w-0 py-0.5 hover:text-[var(--text-primary)] text-[var(--text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-primary)] rounded"
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-medium uppercase tracking-wider truncate flex-1 text-left">
                    {cat.label}
                  </span>
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform",
                      isOpen ? "rotate-90" : "rotate-0"
                    )}
                    aria-hidden="true"
                  />
                </button>
                <div className="shrink-0 w-12 flex items-center justify-end pr-1">
                  <AdminSidebarInfographic
                    spec={cat.infographic}
                    overview={overview}
                  />
                </div>
              </div>

              {isOpen && (
                <ul className="space-y-0.5 pb-1">
                  {cat.pages.map((page) => {
                    const href = page.href || "/admin";
                    const isActive =
                      pathname === href || pathname.startsWith(href + "/");
                    const liveCount = overview?.counts?.[page.label];
                    const hasLive =
                      liveCount !== undefined && liveCount !== null;
                    return (
                      <li key={page.label}>
                        <Link
                          href={href}
                          aria-current={isActive ? "page" : undefined}
                          onClick={onNavigate}
                          className={cn(
                            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm",
                            "transition-colors",
                            isActive
                              ? "bg-[color-mix(in_srgb,var(--action-primary)_14%,transparent)] text-[var(--text-primary)] font-medium"
                              : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                          )}
                        >
                          <span className="flex-1 truncate">{page.label}</span>
                          {hasLive && (
                            <span
                              className={cn(
                                "ml-auto inline-flex items-center justify-center rounded-full text-[10px] font-medium min-w-[18px] h-[18px] px-1",
                                isActive
                                  ? "bg-[color-mix(in_srgb,var(--action-primary)_22%,transparent)] text-[var(--text-primary)]"
                                  : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                              )}
                              title={`${page.label}: ${liveCount} live`}
                            >
                              {liveCount}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}

        {/* Personal footer routes (manifest `personal`) */}
        {!isCollapsed && personalRoutes.length > 0 && (
          <div className="border-t border-[var(--border)] mt-2 pt-2 px-1">
            {personalRoutes.map((p) => {
              const href = p.href || "/admin";
              const isActive =
                pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={p.href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-[color-mix(in_srgb,var(--action-primary)_14%,transparent)] text-[var(--text-primary)] font-medium"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <span className="flex-1 truncate">{p.label}</span>
                  <ArrowUpRight
                    className="h-3.5 w-3.5 opacity-60"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Account footer: profile button + appearance + sign out */}
      <div className="shrink-0 border-t border-[var(--border)] p-2">
        <ProfileMenuButton consoleRoot="/admin" compact={isCollapsed} />
      </div>
    </aside>
  );
}
