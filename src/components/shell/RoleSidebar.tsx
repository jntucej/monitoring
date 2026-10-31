"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavGroup, NavLink, RoleManifest } from "./types";

function isActive(pathname: string | null, href: string, rootHref: string) {
  if (!pathname) return false;
  if (href === rootHref) return pathname === rootHref;
  return pathname === href || pathname.startsWith(href + "/");
}

function groupActive(pathname: string | null, group: NavGroup, rootHref: string) {
  return group.children.some((c) => isActive(pathname, c.href, rootHref));
}

export function RoleSidebar({
  manifest,
  onNavigate,
}: {
  manifest: RoleManifest;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(manifest.storageKey);
      if (raw) setExpanded(JSON.parse(raw));
    } catch {
      /* storage blocked — start collapsed */
    }
  }, [manifest.storageKey]);

  useEffect(() => {
    const active = manifest.nav.find(
      (e): e is NavGroup =>
        e.kind === "group" && groupActive(pathname, e, manifest.rootHref)
    );
    if (!active) return;
    setExpanded((prev) => {
      if (prev[active.id]) return prev;
      const next = { ...prev, [active.id]: true };
      try {
        localStorage.setItem(manifest.storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [pathname, manifest]);

  const toggle = useCallback(
    (id: string) => {
      setExpanded((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        try {
          localStorage.setItem(manifest.storageKey, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [manifest.storageKey]
  );

  const close = useCallback(() => onNavigate?.(), [onNavigate]);
  const Footer = manifest.footer;

  return (
    <div className="flex h-full w-full flex-col bg-[var(--bg-surface)]">
      <header className="shrink-0 border-b border-[var(--border)] px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          {manifest.brand.short}
        </p>
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {manifest.brand.long}
        </p>
      </header>

      <nav
        className="flex-1 overflow-y-auto p-2"
        aria-label={`${manifest.role} navigation`}
      >
        {manifest.nav.map((entry) =>
          entry.kind === "link" ? (
            <LinkRow
              key={entry.href}
              entry={entry}
              active={isActive(pathname, entry.href, manifest.rootHref)}
              onNavigate={close}
            />
          ) : (
            <GroupRow
              key={entry.id}
              group={entry}
              expanded={!!expanded[entry.id]}
              active={groupActive(pathname, entry, manifest.rootHref)}
              pathname={pathname}
              rootHref={manifest.rootHref}
              onToggle={() => toggle(entry.id)}
              onNavigate={close}
            />
          )
        )}
      </nav>

      <footer className="shrink-0 border-t border-[var(--border)] p-2 space-y-1">
        {Footer && <Footer />}
        {manifest.hasProfile !== false && (
          <Link
            href={`${manifest.rootHref}/profile`}
            onClick={close}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          >
            Account settings
          </Link>
        )}
      </footer>
    </div>
  );
}

function LinkRow({
  entry,
  active,
  onNavigate,
}: {
  entry: NavLink;
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
        "mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
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
  rootHref,
  onToggle,
  onNavigate,
}: {
  group: NavGroup;
  expanded: boolean;
  active: boolean;
  pathname: string | null;
  rootHref: string;
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
        <Chevron className="size-3.5 shrink-0 text-[var(--text-muted)]" />
      </button>

      {expanded && (
        <ul className="mt-0.5 space-y-0.5 pl-7">
          {group.children.map((child) => {
            const childActive = isActive(pathname, child.href, rootHref);
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
