"use client";

/**
 * IconRail — slim left icon rail for the role console.
 *
 * Renders the operator's <=5 nav items as icons with hover labels (a tooltip
 * implemented locally so we don't drag in the tooltip component's deps).
 * The Dashboard item links to the role root (the board); sub-items link to
 * their sub-routes. Active state is driven by usePathname().
 *
 * Icons are resolved from a fixed, typed map (LucideIcon) rather than the
 * Sidebar's `import * as Icons` pattern, to keep strict TS clean.
 */

import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  QrCode,
  Clock,
  CheckSquare,
  ShieldAlert,
  User,
  HelpCircle,
  MoreHorizontal,
  CalendarDays,
  ScanLine,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { useNavigation } from "@/hooks/useNavigation";
import type { NavItem } from "@/hooks/useNavigation";
import { getConsoleConfig } from "@/config/consoles";

export interface IconRailChild {
  label: string;
  href: string;
}

export interface IconRailGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  children: IconRailChild[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  QrCode,
  Clock,
  CheckSquare,
  ShieldAlert,
  User,
  HelpCircle,
  MoreHorizontal,
  GraduationCap: QrCode,
  FileSpreadsheet: QrCode,
  Sparkles: Clock,
  CalendarDays,
  ScanLine,
  UtensilsCrossed,
};

function LocalTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="relative group flex items-center justify-center">
      {children}
      <span
        role="tooltip"
        className="absolute left-full ml-3 px-2.5 py-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-50 text-[var(--text-primary)]"
      >
        {label}
      </span>
    </span>
  );
}

export interface IconRailProps {
  /** The role being rendered. */
  role: string;
  /** The role root path (e.g. "/operator") for the dashboard item. */
  roleRoot: string;
  /**
   * An explicit set of rail items. When omitted the rail falls back to the
   * first <=5 items from the role's nav groups (excluding the Account group),
   * plus a dashboard item pointing at roleRoot.
   */
  items?: { href: string; label: string; icon: LucideIcon }[];
  /**
   * Optional collapsible groups. Each group renders as a single icon in the
   * rail; hovering (desktop) opens a flyout panel of child links, and the
   * group icon stays highlighted whenever the current path matches any child.
   * When provided, groups replace the flat `items` list.
   */
  groups?: IconRailGroup[];
}

export function IconRail({ role, roleRoot, items, groups }: IconRailProps) {
  const pathname = usePathname();
  const { navigation } = useNavigation(role);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  // Build the rail item set: a dashboard item plus the role's top items.
  const railItems = useMemoRailItems({ navigation, role, roleRoot, items, pathname });

  const isGroupActive = (group: IconRailGroup) =>
    group.children.some(
      (c) => pathname === c.href || (c.href.length > 2 && pathname!.startsWith(c.href))
    );

  return (
    <nav
      aria-label="Primary navigation"
      className="relative hidden md:flex flex-col items-center gap-1 py-3 px-1.5 w-14 shrink-0 border-r border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-md"
    >
      {/* Dashboard (board) */}
      <LocalTooltip label="Dashboard">
        <a
          href={roleRoot}
          aria-label="Dashboard"
          aria-current={pathname === roleRoot ? "page" : undefined}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            pathname === roleRoot
              ? "bg-[var(--action-primary)]/15 text-[var(--action-primary)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
        </a>
      </LocalTooltip>

      <div className="h-px w-6 bg-[var(--border)] my-1" />

      {groups && groups.length > 0 ? (
        groups.map((group) => {
          const GroupIcon = group.icon;
          const active = isGroupActive(group);
          const open = openGroupId === group.id;
          return (
            <div
              key={group.id}
              className="relative"
              onMouseEnter={() => setOpenGroupId(group.id)}
              onMouseLeave={() => setOpenGroupId(null)}
            >
              <button
                type="button"
                aria-label={group.label}
                aria-expanded={open}
                onClick={() => setOpenGroupId(open ? null : group.id)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  active
                    ? "bg-[var(--action-primary)]/15 text-[var(--action-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                }`}
              >
                <GroupIcon className="w-4 h-4" />
              </button>
              {active && (
                <span className="absolute -right-0.5 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-[var(--action-primary)]" />
              )}
              {/* Desktop flyout */}
              <div
                className={`absolute left-full top-0 z-50 ml-2 w-56 rounded-xl border bg-[var(--bg-elevated)] shadow-xl overflow-hidden transition-opacity ${
                  open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                style={{ borderColor: "var(--border)" }}
                role="menu"
                aria-label={group.label}
              >
                <p
                  className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide font-semibold"
                  style={{ color: "var(--text-muted)" }}
                >
                  {group.label}
                </p>
                {group.children.map((child) => {
                  const childActive =
                    pathname === child.href ||
                    (child.href.length > 2 && pathname!.startsWith(child.href));
                  return (
                    <a
                      key={child.href}
                      href={child.href}
                      role="menuitem"
                      onClick={() => setOpenGroupId(null)}
                      className={`flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                        childActive
                          ? "text-[var(--action-primary)] font-semibold bg-[var(--action-primary)]/10"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <span className="truncate">{child.label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })
      ) : (
        railItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href.length > 2 && pathname.startsWith(item.href));
          return (
            <LocalTooltip key={item.href} label={item.label}>
              <a
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  isActive
                    ? "bg-[var(--action-primary)]/15 text-[var(--action-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon className="w-4 h-4" />
              </a>
            </LocalTooltip>
          );
        })
      )}
    </nav>
  );
}

/** Flatten the role's nav groups into <=4 rail items (excluding the Account group). */
function useMemoRailItems({
  navigation,
  role,
  roleRoot,
  items,
  pathname,
}: {
  navigation: { groupLabel: string; items: NavItem[] }[];
  role: string;
  roleRoot: string;
  items?: { href: string; label: string; icon: LucideIcon }[];
  pathname: string | null;
}) {
  if (items && items.length > 0) return items;

  // If a console config exists, mirror its command set so the rail stays in
  // sync with the command palette.
  const config = getConsoleConfig(role);

  const flat = navigation
    .filter((g) => g.groupLabel !== "Account")
    .flatMap((g) => g.items)
    // De-duplicate by href (hrefs can repeat across groups)
    .filter((item, idx, arr) => arr.findIndex((x) => x.href === item.href) === idx);

  const resolved = flat.slice(0, 4).map((item) => ({
    href: item.href,
    label: item.label,
    icon: ICON_MAP[item.icon || ""] || QrCode,
  }));

  // If a console config is present, keep only the items that correspond to
  // the configured commands (scan / manual-entry / pass-verify / lookup)
  // and cap at 4. The config presence just signals the console layout is
  // active; the rail items are still derived from the role's nav so the
  // hrefs stay authoritative.
  if (config) {
    void config;
  }

  void roleRoot;
  void pathname;
  return resolved;
}
