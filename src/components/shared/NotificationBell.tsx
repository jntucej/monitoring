'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Info, AlertTriangle, AlertCircle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';

import { Notification } from '@/lib/notification-types';
import { useGlossyMotion } from '@/lib/animations';

const PRIORITY_ICONS = {
  low: Info,
  medium: Bell,
  high: AlertTriangle,
  critical: AlertCircle,
};

const PRIORITY_COLORS = {
  low: 'text-action-primary',
  medium: 'text-yellow-500',
  high: 'text-orange-500',
  critical: 'text-action-danger',
};

// Roles the /api/notifications route actually serves. Polling for any
// other role returns 403 and spams the console with errors on every
// mount, so the bell renders inert (no data, no bell action count) for
// roles outside this allowlist instead of firing a doomed request.
const BELL_SUPPORTED_ROLES = new Set([
  'admin', 'sysadmin', 'operator', 'supervisor',
  'vice_principal', 'principal', 'hod', 'staff', 'faculty',
]);

export function NotificationBell() {
  const { user } = useAuthStore();
  const bellSupported = BELL_SUPPORTED_ROLES.has(user?.role ?? '');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isGlossyMotion = useGlossyMotion();

  const loadNotifications = async () => {
    if (!bellSupported) return; // role not served by /api/notifications — stay inert
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?type=${encodeURIComponent(user.role || 'all')}&id=${encodeURIComponent(user.id)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setNotifications(json.data);
        setUnreadCount(json.data.filter((n: any) => !n.readAt && !n.resolved).length);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bellSupported && user?.id) {
      loadNotifications();

      // Realtime Server-Sent Events (SSE) stream for instant alerts
      let eventSource: EventSource | null = null;
      try {
        const streamUrl = `/api/notifications/stream?userId=${encodeURIComponent(user.id)}&role=${encodeURIComponent(user.role || 'user')}`;
        eventSource = new EventSource(streamUrl);

        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.type === 'notifications' && Array.isArray(parsed.data)) {
              setNotifications(parsed.data);
              setUnreadCount(parsed.data.filter((n: Notification) => !n.readAt).length);
            }
          } catch (parseErr) {
            console.error('Failed to parse SSE notification message:', parseErr);
          }
        };

        eventSource.onerror = (err) => {
          console.warn('Notification SSE connection error (falling back to polling):', err);
        };
      } catch (err) {
        console.error('SSE stream setup error:', err);
      }

      return () => {
        if (eventSource) {
          eventSource.close();
        }
      };
    }
  }, [bellSupported, user?.id, user?.role]);

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
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    setUnreadCount(0);
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter((n) => !n.readAt) 
    : notifications;

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        animate={isGlossyMotion && unreadCount > 0 ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 5 }}
        onClick={() => setIsOpen(!isOpen)}
        className="surface-card relative p-2 text-text-muted hover:text-text-primary hover:bg-[var(--bg-card)] transition-all hover: active:scale-95 focus:outline-none"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-action-danger text-white text-xs font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-5 max-w-sm bg-bg-surface shadow-2xl backdrop-blur-xl z-50 overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="surface-card p-4 flex items-center justify-between bg-[var(--bg-card)]/50">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-text-primary text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="surface-card px-2 py-0.5 text-xs bg-rose-500/10 text-action-danger font-medium">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="surface-card flex bg-bg-base/50 px-4 py-2 gap-2 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 transition-colors font-medium`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-2.5 py-1 transition-colors font-medium`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto flex-1 divide-y divide-border">
              {loading && notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted">
                  Loading notifications...
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-text-muted flex flex-col items-center gap-2">
                  <Bell className="size-5 opacity-20" />
                  <p className="text-xs">No notifications yet</p>
                </div>
              ) : (
                filteredNotifications.map((n) => {
                  const Icon = PRIORITY_ICONS[n.priority] || Bell;
                  const color = PRIORITY_COLORS[n.priority] || 'text-text-muted';

                  return (
                    <div
                      key={n.id}
                      className={`p-4 transition-colors hover:bg-[var(--bg-card)]/60 flex items-start gap-3 ${
                        !n.readAt ? 'bg-[var(--bg-card)]/30' : ''
                      }`}
                    >
                      <div className={`p-2 bg-bg-base mt-0.5 shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-4">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-xs font-semibold truncate ${!n.readAt ? 'text-text-primary' : 'text-text-muted'}`}>
                            {n.title}
                          </h4>
                          <span className="text-xs text-text-muted shrink-0">
                            {getTimeAgo(n.createdAt || (n as any).created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted mt-1 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        {(n as any).action_url && (
                          <a
                            href={(n as any).action_url}
                            className="inline-flex items-center gap-1 text-xs text-action-info hover:text-action-info mt-2 font-medium"
                          >
                            View details
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}
                      </div>
                      {!n.readAt && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="surface-card text-text-muted hover:text-action-success p-1 hover:bg-bg-base transition-colors mt-0.5 shrink-0"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
