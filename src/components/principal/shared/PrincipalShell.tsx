"use client";

/* ── PrincipalLayoutShell — layout wrapper (sidebar + content) ── */

import { memo, useState } from "react";
import { PrincipalSidebar } from "./PrincipalSidebar";
import type { NotificationItem } from "./PrincipalNotifications";

interface PrincipalLayoutShellProps {
  children: React.ReactNode;
  notifications?: NotificationItem[];
  unreadCount?: number;
}

export const PrincipalLayoutShell = memo(function PrincipalLayoutShell({
  children,
  notifications = [],
  unreadCount = 0,
}: PrincipalLayoutShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--bg-base)]">
      <PrincipalSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
});

/* ── PrincipalShell — page-level container (title/subtitle/actions) ── */

import { type ReactNode } from "react";

export const PrincipalShell = memo(function PrincipalShell({
  title, subtitle, actions, children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-fluid-2xl font-semibold tracking-tight text-[var(--text-primary)]">{title}</h1>
          {subtitle && <p className="mt-1 text-fluid-sm text-[var(--text-muted)]">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className="space-y-8">{children}</div>
    </div>
  );
});
