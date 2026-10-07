'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Info, AlertTriangle, AlertCircle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { getNotifications, markNotificationRead, markAllNotificationsRead, getUnreadCount } from '@/lib/notification-service';
import { Notification } from '@/lib/notification-types';
import { useGlossyMotion } from '@/lib/animations';

const PRIORITY_ICONS = {
  low: Info,
  medium: Bell,
  high: AlertTriangle,
  critical: AlertCircle,
};

const PRIORITY_COLORS = {
  low: 'text-blue-500',
  medium: 'text-yellow-500',
  high: 'text-orange-500',
  critical: 'text-rose-500',
};

export function NotificationBell() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isGlossyMotion = useGlossyMotion();

  const loadNotifications = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getNotifications(user.id);
      setNotifications(data);
      const count = await getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to load notifications:', err);
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
        const streamUrl = `/api/notifications/stream?userId=${encodeURIComponent(user.id)}&role=${encodeURIComponent(user.role || 'user')}`;
        eventSource = new EventSource(streamUrl);

        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.type === 'notifications' && Array.isArray(parsed.data)) {
              setNotifications(parsed.data);
              setUnreadCount(parsed.data.filter((n: Notification) => !n.read).length);
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
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount(Math.max(0, unreadCount - 1));
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    await markAllNotificationsRead(user.id);
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
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
    ? notifications.filter((n) => !n.read) 
    : notifications;

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        animate={isGlossyMotion && unreadCount > 0 ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 5 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-xl transition-all border border-transparent hover:border-[var(--border)] active:scale-95 focus:outline-none"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
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
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-card)]/50">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[var(--text-primary)] text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-rose-500/10 text-rose-400 rounded-full font-medium border border-rose-500/20">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-[var(--border)] bg-[var(--bg-base)]/50 px-4 py-2 gap-2 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                  filter === 'all'
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                  filter === 'unread'
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto flex-1 divide-y divide-[var(--border)]">
              {loading && notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                  Loading notifications...
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-muted)] flex flex-col items-center gap-2">
                  <Bell className="w-8 h-8 opacity-20" />
                  <p className="text-xs">No notifications yet</p>
                </div>
              ) : (
                filteredNotifications.map((n) => {
                  const Icon = PRIORITY_ICONS[n.priority] || Bell;
                  const color = PRIORITY_COLORS[n.priority] || 'text-slate-400';

                  return (
                    <div
                      key={n.id}
                      className={`p-4 transition-colors hover:bg-[var(--bg-card)]/60 flex items-start gap-3 ${
                        !n.read ? 'bg-[var(--bg-card)]/30' : ''
                      }`}
                    >
                      <div className={`p-2 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] mt-0.5 shrink-0 ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-xs font-semibold truncate ${!n.read ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                            {n.title}
                          </h4>
                          <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                            {getTimeAgo(n.createdAt || (n as any).created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        {(n as any).action_url && (
                          <a
                            href={(n as any).action_url}
                            className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 mt-2 font-medium"
                          >
                            View details
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {!n.read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="text-[var(--text-muted)] hover:text-emerald-400 p-1 rounded-lg hover:bg-[var(--bg-base)] transition-colors mt-0.5 shrink-0"
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
