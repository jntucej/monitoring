"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import type { IconRailGroup } from "@/components/shared/IconRail";

interface MobileGroupsDrawerProps {
  groups: IconRailGroup[];
  roleRoot: string;
}

/**
 * Mobile-only navigation drawer. Renders a hamburger button (visible below
 * md:) that opens a full-screen drawer listing the role's collapsible
 * groups as accordion sections. Each section expands to show its child
 * links. Tapping a child link auto-closes the drawer.
 *
 * This is the mobile counterpart of the IconRail flyout — on desktop the
 * rail + flyout handles it, here the drawer + accordion does.
 */
export function MobileGroupsDrawer({ groups, roleRoot: _roleRoot }: MobileGroupsDrawerProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const toggleGroup = (id: string) =>
    setExpandedGroup((prev) => (prev === id ? null : id));

  const childActive = (href: string) =>
    pathname === href || (href.length > 2 && pathname!.startsWith(href));

  const groupActive = (group: IconRailGroup) =>
    group.children.some((c) => childActive(c.href));

  return (
    <>
      {/* Hamburger button — mobile only */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className="md:hidden fixed top-3 left-3 z-50 min-w11 min-h11 rounded-xl flex items-center justify-center border border-border bg-bg-elevated/95 backdrop-blur-md text-text-secondary active:scale-95 transition-transform"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <nav
        aria-label="Mobile navigation drawer"
        role="dialog"
        aria-modal="true"
        className={`md:hidden fixed inset-y-0 left-0 z-50 w70 max-w-[85vw] bg-bg-elevated border-r border-border shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="surface-card flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-action-primary" />
            <span className="text-xs font-bold text-text-primary uppercase tracking-wide">
              Navigation
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
            className="min-w11 min-h11 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          {groups.map((group) => {
            const GroupIcon: LucideIcon = group.icon;
            const active = groupActive(group);
            const expanded = expandedGroup === group.id;
            return (
              <div key={group.id} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={expanded}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    active
                      ? "text-action-primary bg-action-primary/10 font-semibold"
                      : "text-text-secondary hover:bg-bg-surface hover:text-text-primary"
                  }`}
                >
                  <GroupIcon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left truncate">{group.label}</span>
                  <span
                    className={`text-xs text-text-muted transition-transform ${
                      expanded ? "rotate-90" : ""
                    }`}
                  >
                    ›
                  </span>
                </button>
                {expanded && (
                  <div className="surface-card ml-4 pl-2 mt-0.5 mb-1">
                    {group.children.map((child) => (
                      <a
                        key={child.href}
                        href={child.href}
                        onClick={() => setOpen(false)}
                        className={`block px-3 py-2 rounded-lg text-xs transition-colors ${
                          childActive(child.href)
                            ? "text-action-primary font-semibold bg-action-primary/10"
                            : "text-text-secondary hover:bg-bg-surface hover:text-text-primary"
                        }`}
                      >
                        {child.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export default MobileGroupsDrawer;
