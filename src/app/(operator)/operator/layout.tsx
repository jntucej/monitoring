"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  QrCode,
  Clock,
  ShieldAlert,
  MoreHorizontal,
  Mic,
  KeyRound,
  UserCheck,
  Camera,
  User,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { getConsoleConfig } from "@/config/consoles";

/**
 * Operator layout — lean gate-desk shell with a 4-icon rail.
 *
 * Desktop: slim vertical icon rail (w-12, sticky) with 4 icons:
 *   Scan (QrCode, /operator) · Log (Clock, /operator/transactions)
 *   Flags (ShieldAlert, /operator/exceptions) · More (MoreHorizontal, popover)
 *
 * Mobile: compact top strip of the same 4 icons.
 *
 * The "More" icon opens a simple useState popover (no dropdown library)
 * with: Voice Assistant, Manual Entry, Pass Verification, Camera Scanner,
 * Profile, Notifications.
 *
 * No Account group (Account lives in the app shell footer). No horizontal
 * scroll. No text-only tabs.
 */

const ICONS: Record<string, LucideIcon> = {
  scan: QrCode,
  log: Clock,
  flags: ShieldAlert,
  more: MoreHorizontal,
};

const HREFS: Record<string, string> = {
  scan: "/operator",
  log: "/operator/transactions",
  flags: "/operator/exceptions",
};

const LABELS: Record<string, string> = {
  scan: "Scan",
  log: "Log",
  flags: "Flags",
  more: "More",
};

interface MoreMenuItem {
  label: string;
  icon: LucideIcon;
  action: () => void;
  href?: string;
}

export default function OperatorSectionLayout({
  children,
}: {
  children?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const config = getConsoleConfig("operator");
  const nav = config?.nav ?? ["scan", "log", "flags", "more"];

  const isActive = (key: string) => {
    const href = HREFS[key];
    if (!href) return false;
    return pathname === href || (href.length > 2 && pathname.startsWith(href + "/"));
  };

  const moreMenuItems: MoreMenuItem[] = [
    {
      label: "Voice Assistant",
      icon: Mic,
      action: () => {
        router.push("/operator");
        setMoreOpen(false);
      },
    },
    {
      label: "Manual Entry",
      icon: KeyRound,
      action: () => {
        router.push("/operator/manual-entry");
        setMoreOpen(false);
      },
    },
    {
      label: "Pass Verification",
      icon: UserCheck,
      action: () => {
        router.push("/operator/pass-verification");
        setMoreOpen(false);
      },
    },
    {
      label: "Camera Scanner",
      icon: Camera,
      action: () => {
        router.push("/operator/scan");
        setMoreOpen(false);
      },
    },
    {
      label: "Profile",
      icon: User,
      action: () => {
        router.push("/profile");
        setMoreOpen(false);
      },
    },
    {
      label: "Notifications",
      icon: Bell,
      action: () => {
        router.push("/settings/notifications");
        setMoreOpen(false);
      },
    },
  ];

  const renderRailIcon = (key: string, isMore: boolean = false) => {
    if (isMore) {
      return (
        <div className="relative" key={key}>
          <button
            type="button"
            aria-label={LABELS[key]}
            title={LABELS[key]}
            aria-expanded={moreOpen}
            aria-haspopup="true"
            onClick={() => setMoreOpen(!moreOpen)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              moreOpen
                ? "bg-[var(--action-primary)]/15 text-[var(--action-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
            }`}
          >
            <ICONS.more className="w-4 h-4" />
          </button>
          {moreOpen && (
            <div
              role="menu"
              aria-label="More actions"
              className="absolute right-full top-0 mr-2 w-44 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-lg py-1 z-50"
            >
              {moreMenuItems.map((item) => (
                <button
                  key={item.label}
                  role="menuitem"
                  type="button"
                  onClick={item.action}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-2 transition-colors"
                >
                  <item.icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    const Icon = ICONS[key];
    if (!Icon) return null;
    const active = isActive(key);
    return (
      <Link
        key={key}
        href={HREFS[key]}
        aria-label={LABELS[key]}
        title={LABELS[key]}
        aria-current={active ? "page" : undefined}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
          active
            ? "bg-[var(--action-primary)]/15 text-[var(--action-primary)]"
            : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        }`}
      >
        <Icon className="w-4 h-4" />
      </Link>
    );
  };

  return (
    <div className="flex min-w-0">
      {/* Slim icon rail (desktop). No horizontal scroll: a vertical stack. */}
      <nav
        aria-label="Operator sections"
        className="hidden md:flex flex-col items-center gap-1 py-3 px-1.5 w-12 shrink-0 border-r border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-md sticky top-0 h-dvh"
      >
        {nav.map((key) => renderRailIcon(key, key === "more"))}
      </nav>

      {/* Mobile: a compact top strip of the same 4 icons. No horizontal
          scroll — only four icons, they always fit. */}
      <nav
        aria-label="Operator sections"
        className="md:hidden sticky top-0 z-30 flex items-center justify-center gap-2 py-2 px-3 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border)]"
      >
        {nav.map((key) => renderRailIcon(key, key === "more"))}
      </nav>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
