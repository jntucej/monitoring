"use client";

/* ── PrincipalNotifications ── */

import { memo } from "react";
import { Bell, BellOff } from "lucide-react";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export const PrincipalNotifications = memo(function PrincipalNotifications({
  notifications = [],
  unreadCount = 0,
}: {
  notifications?: NotificationItem[];
  unreadCount?: number;
}) {
  return (
    <div className="relative">
      <button className="relative p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>
      {notifications.length > 0 && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-lg">
          <p className="mb-2 text-xs font-semibold text-[var(--text-muted)]">Notifications</p>
          {notifications.slice(0, 5).map((n) => (
            <div key={n.id} className={`mb-2 rounded-lg p-2 ${n.read ? "" : "bg-[var(--bg-elevated)]"}`}>
              <p className="text-xs font-medium text-[var(--text-primary)]">{n.title}</p>
              <p className="mt-0.5 text-[10px] text-[var(--text-muted)] line-clamp-2">{n.message}</p>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">{n.time}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
