"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HOD_NAV,
  isPathActive,
  isGroupActive,
  NAV_STORAGE_KEY,
  type HodGroup,
  type HodLink,
} from "./nav";
import { StreakBadge } from "../_retention/StreakBadge";

export function HodSidebar({
  mode,
  onNavigate,
}: {
  mode: "expanded" | "drawer";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Hydrate persisted expansion state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(NAV_STORAGE_KEY);
      if (raw) setExpanded(JSON.parse(raw));
    } catch {
      /* storage blocked — start collapsed */
    }
  }, []);

  // Auto-expand the group that contains the current URL
  useEffect(() => {
    const active = HOD_NAV.find(
      (e): e is HodGroup => e.kind === "group" && isGroupActive(pathname, e)
    );
    if (!active) return;
    setExpanded((prev) => {
      if (prev[active.id]) return prev;
      const next = { ...prev, [active.id]: true };
      try {
        localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [pathname]);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const close = useCallback(() => {
    onNavigate?.();
  }, [onNavigate]);

  return (
    <div className="flex h-full w-full flex-col bg-[var(--bg-surface)]">
      <header className="shrink-0 border-b border-[var(--border)] px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          HOD
        </p>
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          Department Console
        </p>
      </header>

      <nav className="flex-1 overflow-y-auto p-2" aria-label="HOD navigation">
        {HOD_NAV.map((entry) =>
          entry.kind === "link" ? (
            <LinkRow
              key={entry.href}
              entry={entry}
              active={isPathActive(pathname, entry.href)}
              onNavigate={close}
            />
          ) : (
            <GroupRow
              key={entry.id}
              group={entry}
              expanded={!!expanded[entry.id]}
              active={isGroupActive(pathname, entry)}
              pathname={pathname}
              onToggle={() => toggle(entry.id)}
              onNavigate={close}
            />
          )
        )}
      </nav>

      <footer className="shrink-0 border-t border-[var(--border)] p-2 space-y-1">
        {/* Dual streak footer */}
        <div className="flex items-center justify-between rounded-lg px-3 py-1.5 text-xs">
          <span className="text-[var(--text-muted)]">Streaks</span>
          <StreakBadge compact />
        </div>

        {/* Focus mode trigger */}
        <button
          type="button"
          onClick={() => {
            // Dispatch a custom event the shell will listen to
            window.dispatchEvent(new CustomEvent("hod:open-focus-mode"));
            onNavigate?.();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-[var(--action-primary)] hover:bg-[var(--action-primary)]/10"
        >
          <Target className="size-3.5" />
          Focus mode
        </button>

        <Link
          href="/hod/profile"
          onClick={close}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
        >
          Account settings
        </Link>
      </footer>
    </div>
  );
}

/* ── Individual rows ─────────────────────────────────────────── */

function LinkRow({
  entry,
  active,
  onNavigate,
}: {
  entry: HodLink;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = entry.icon;
  return (
    <Link
      href={entry.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
        active
          ? "bg-[var(--action-primary)]/10 font-medium text-[var(--action-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="flex-1">{entry.label}</span>
    </Link>
  );
}

function GroupRow({
  group,
  expanded,
  active,
  pathname,
  onToggle,
  onNavigate,
}: {
  group: HodGroup;
  expanded: boolean;
  active: boolean;
  pathname: string | null;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const Icon = group.icon;
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <div className="mb-0.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
          active
            ? "text-[var(--action-primary)]"
            : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 text-left">{group.label}</span>
        <Chevron
          className={cn(
            "size-3.5 shrink-0 transition-transform text-[var(--text-muted)]",
            expanded && "rotate-0"
          )}
        />
      </button>

      {expanded && (
        <ul className="mt-0.5 space-y-0.5 pl-7">
          {group.children.map((child) => {
            const childActive = isPathActive(pathname, child.href);
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  onClick={onNavigate}
                  aria-current={childActive ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-3 py-1.5 text-xs transition",
                    childActive
                      ? "bg-[var(--action-primary)]/10 font-medium text-[var(--action-primary)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-secondary)]"
                  )}
                >
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
