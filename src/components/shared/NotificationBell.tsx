"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, BellOff, Info, AlertCircle, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { getNotifications, markNotificationRead, markAllNotificationsRead, getUnreadCount } from "@/lib/notification-service";
import { Notification } from "@/lib/notification-types";
import { supabase } from "@/lib/supabaseClient";

const PRIORITY_ICONS = {
  low: Info,
  medium: AlertCircle,
  high: AlertTriangle,
  critical: AlertTriangle,
};

const PRIORITY_COLORS = {
  low: "text-blue-500",
  medium: "text-amber-500",
  high: "text-orange-500",
  critical: "text-rose-500",
};

export function NotificationBell() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [items, count] = await Promise.all([
        getNotifications(user.id, 20),
        getUnreadCount(user.id),
      ]);
      setNotifications(items);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadNotifications();

      // Realtime Server-Sent Events (SSE) stream for instant alerts
      let eventSource: EventSource | null = null;
      try {
        const streamUrl = `/api/notifications/stream?userId=${encodeURIComponent(user.id)}&role=${encodeURIComponent(user.role || "user")}`;
        eventSource = new EventSource(streamUrl);
        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.type === "notifications" && Array.isArray(parsed.data)) {
              setNotifications(parsed.data);
              setUnreadCount(parsed.unreadCount ?? parsed.data.filter((n: any) => !n.read).length);
            }
          } catch {}
        };
      } catch (err) {
        console.error("SSE stream setup error:", err);
      }

      // Realtime Supabase listener
      const channel = supabase
        .channel(`user-notifications-${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          () => {
            loadNotifications();
          }
        )
        .subscribe();

      return () => {
        if (eventSource) eventSource.close();
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
    setUnreadCount(Math.max(0, unreadCount - 1));
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    await markAllNotificationsRead(user.id);
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <>
            <Bell className="w-5 h-5 text-[var(--action-primary)] animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </>
        ) : (
          <BellOff className="w-5 h-5" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[500px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs text-[var(--text-muted)]">
                  ({unreadCount} unread)
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-[var(--action-primary)] hover:underline font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-[400px]">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-[var(--action-primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BellOff className="w-8 h-8 text-[var(--text-muted)] mb-2" />
                <p className="text-sm text-[var(--text-muted)]">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = PRIORITY_ICONS[notification.priority] || Info;
                const colorClass = PRIORITY_COLORS[notification.priority] || 'text-blue-500';
                const isUnread = !notification.read;

                return (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer ${
                      isUnread ? 'bg-[var(--action-primary)]/5' : ''
                    }`}
                    onClick={() => handleMarkRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-4 h-4 mt-0.5 ${colorClass}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${isUnread ? 'font-semibold' : 'font-normal'} text-[var(--text-primary)]`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {getTimeAgo(notification.createdAt)}
                          </span>
                          {notification.channels && notification.channels.length > 0 && (
                            <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">
                              {notification.channels.join(', ')}
                            </span>
                          )}
                          {notification.priority === 'critical' && (
                            <span className="text-[10px] text-rose-500 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">
                              URGENT
                            </span>
                          )}
                        </div>
                      </div>
                      {isUnread && (
                        <div className="w-2 h-2 rounded-full bg-[var(--action-primary)] flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
