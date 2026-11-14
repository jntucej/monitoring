"use client";

/* ── PrincipalTopBar ── */

import { memo } from "react";
import { Crown, Bell, Menu } from "lucide-react";


interface PrincipalTopBarProps {
  role?: string;
  userName?: string;
  unreadCount?: number;
  onMenuClick?: () => void;
}

export const PrincipalTopBar = memo(function PrincipalTopBar({
  role,
  userName,
  unreadCount = 0,
  onMenuClick,
}: PrincipalTopBarProps) {
  return (
    <header className="surface-card sticky top-0 z-40 flex h-14 items-center justify-between bg-bg-surface px-4">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="md:hidden p-1.5 text-text-muted hover:text-text-primary">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-action-warning" />
          <span className="text-sm font-semibold text-text-primary">Principal Console</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {role && (
          <span className="hidden text-xs font-medium uppercase tracking-wide text-text-muted sm:inline-block">
            {role}
          </span>
        )}
        {userName && (
          <span className="hidden text-xs text-text-muted sm:inline-block">
            {userName}
          </span>
        )}
        <button className="relative p-2 text-text-muted hover:text-text-primary">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-action-danger text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
});
