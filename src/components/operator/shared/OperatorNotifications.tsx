"use client";

// src/components/operator/shared/OperatorNotifications.tsx
// Operator-specific copy of @/components/shared/NotificationCenter

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  CheckCheck,
  X,
  Loader2,
} from "lucide-react";
import { useAuthStore, useHasHydrated } from "@/stores/authStore";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getTimeAgo } from "@/lib/utils";
import { useNotificationStore, deriveNotifications, type NotificationItem, type NotificationUrgency } from "@/stores/notificationStore";
import { OperatorWidgetBoundary } from "./OperatorWidgetBoundary";

/**
 * OperatorNotifications — a notification dropdown / inbox that groups alerts
 * by urgency (urgent / approval / info / overdue).
 *
 * Data source: /api/notifications (primary, via useApiResource + polling)
 * plus /api/alerts and /api/permissions (derived buckets for roles that
 * the /api/notifications route does not serve). Read state is persisted in
 * the zustand notification store. The unread badge count is derived from
 * the store's readIds.
 */

const URGENCY_META: Record<NotificationUrgency, { label: string; icon: React.ComponentType<{ className?: string }>; accent: string }> = {
  urgent: { label: "Urgent", icon: AlertTriangle, accent: "text-action-danger" },
  approval: { label: "Approval", icon: CheckCircle2, accent: "text-action-primary" },
  overdue: { label: "Overdue", icon: Clock, accent: "text-action-warning" },
  info: { label: "Info", icon: Info, accent: "text-action-info" },
};

const URGENCY_ORDER: NotificationUrgency[] = ["urgent", "overdue", "approval", "info"];

interface NotificationsResponse {
  success: boolean;
  data: Array<Record<string, unknown>>;
}

interface AlertsResponse {
  success: boolean;
  data: Array<Record<string, unknown>>;
}

/**
 * Roles that the /api/notifications route actually serves (see its
 * requiredRole gate). For all other roles the endpoint returns 403, so
 * the component derives its content from /api/permissions (pending +
 * overdue) and /api/alerts instead.
 */
const NOTIF_ROUTE_ROLES = new Set(["admin", "sysadmin", "parent", "student"]);

export interface OperatorNotificationsProps {
  /** Optional embedded view (no wrapper card). Default: wrapped in a card. */
  compact?: boolean;
  /** Poll interval in ms. Default 30s. */
  pollMs?: number;
  /** Whether the dropdown is controlled externally. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function OperatorNotifications({
  compact = false,
  pollMs = 30_000,
  open: controlledOpen,
  onOpenChange,
}: OperatorNotificationsProps) {
  const hasHydrated = useHasHydrated();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? null;

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = useCallback(
    (v: boolean) => {
      setInternalOpen(v);
      onOpenChange?.(v);
    },
    [onOpenChange]
  );

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Primary source: /api/notifications — only served to these roles
  const notifUrl = useMemo(() => {
    if (!hasHydrated || !user?.id || !role) return null;
    if (!NOTIF_ROUTE_ROLES.has(role)) return null;
    return `/api/notifications?type=${encodeURIComponent(role)}&id=${encodeURIComponent(user.id)}`;
  }, [hasHydrated, user?.id, role]);

  const {
    data: notifData,
    loading: notifLoading,
    refresh: refreshNotif,
  } = useApiResource<NotificationsResponse>(notifUrl, {
    enabled: hasHydrated && !!notifUrl,
    ttlMs: 15_000,
  });

  // Fallback / derived source: /api/permissions (all roles get a scoped view)
  const permissionsUrl = useMemo(() => {
    if (!hasHydrated || !role) return null;
    const status = "PENDING";
    return `/api/permissions?status=${status}`;
  }, [hasHydrated, role]);

  const { data: permissionsData, refresh: refreshPermissions } =
    useApiResource<{ success: boolean; data: Array<Record<string, unknown>> }>(
      permissionsUrl,
      { enabled: hasHydrated && !!permissionsUrl, ttlMs: 15_000 }
    );

  // Secondary source: /api/alerts (for privileged roles that have access)
  const alertsUrl = useMemo(() => {
    if (!hasHydrated || !role) return null;
    const privileged = ["admin", "sysadmin", "principal", "supervisor"].includes(role);
    return privileged ? "/api/alerts?resolved=false" : null;
  }, [hasHydrated, role]);

  const { data: alertsData, refresh: refreshAlerts } = useApiResource<AlertsResponse>(
    alertsUrl,
    { enabled: hasHydrated && !!alertsUrl, ttlMs: 15_000 }
  );

  usePolling(async () => {
    if (notifUrl) await refreshNotif();
    if (permissionsUrl) await refreshPermissions();
    if (alertsUrl) await refreshAlerts();
  }, { intervalMs: pollMs, enabled: hasHydrated });

  // Merge notifications + derived permissions + derived alerts into one list.
  const items = useMemo<NotificationItem[]>(() => {
    const notifRows = notifData?.data ?? null;
    const permissionRows = permissionsData?.data ?? null;
    const alertRows = alertsData?.data ?? null;
    const derived = deriveNotifications(permissionRows, alertRows);

    if (!Array.isArray(notifRows) || notifRows.length === 0) return derived;

    const notifItems: NotificationItem[] = notifRows.map((row) => {
      const type = String(row.type ?? "info");
      const urgency: NotificationUrgency =
        type === "permission_pending" || type === "permission"
          ? "approval"
          : type === "overdue" || type === "emergency"
          ? "urgent"
          : "info";
      return {
        id: `notif-${String(row.id ?? Math.random())}`,
        urgency,
        title: String(row.title ?? row.type ?? "Notification"),
        message: row.message ? String(row.message) : undefined,
        createdAt: row.created_at ? String(row.created_at) : undefined,
        ticketNumber: row.ticket_number ? String(row.ticket_number) : undefined,
      };
    });

    const derivedIds = new Set(derived.map((d) => d.ticketNumber).filter(Boolean));
    const merged = [...derived, ...notifItems.filter((n) => n.ticketNumber && !derivedIds.has(n.ticketNumber))];
    return merged;
  }, [notifData, permissionsData, alertsData]);

  const store = useNotificationStore();
  const readIds = useNotificationStore((s) => s.readIds);
  const unreadCount = useMemo(
    () => items.filter((n) => !readIds.includes(n.id)).length,
    [items, readIds]
  );

  // Group by urgency
  const groups = useMemo(() => {
    const byUrgency: Record<NotificationUrgency, NotificationItem[]> = {
      urgent: [],
      overdue: [],
      approval: [],
      info: [],
    };
    for (const item of items) {
      byUrgency[item.urgency]?.push(item);
    }
    for (const key of URGENCY_ORDER) {
      byUrgency[key] = byUrgency[key].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    }
    return byUrgency;
  }, [items]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, setOpen]);

  const handleMarkRead = useCallback(
    (id: string) => {
      store.markRead(id);
    },
    [store]
  );

  const handleMarkAllRead = useCallback(() => {
    store.markAllRead(items.map((n) => n.id));
  }, [store, items]);

  const badge = (
    <span className="relative flex size-5 items-center justify-center rounded-xl border border-border bg-bg-surface text-text-secondary hover:bg-bg-elevated transition-colors">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="surface-card absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center bg-action-danger px-1 text-xs font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </span>
  );

  const inner = (
    <div ref={dropdownRef} className="relative min-w-3">
      <button
        type="button"
        onClick={() => setOpen(!isOpen)}
        aria-label={`Notifications (${unreadCount} unread)`}
        className="block"
      >
        {badge}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-full sm:w-5 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-bg-surface shadow-2xl backdrop-blur-xl z-50 overflow-hidden flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="surface-card flex items-center justify-between gap-2 p-3">
            <div className="flex items-center gap-2 min-w-3">
              <Bell className="h-5 w-5 text-action-primary shrink-0" />
              <span className="text-sm font-semibold text-text-primary">Notifications</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="surface-card inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-action-primary hover:bg-bg-elevated transition-colors"
                >
                  <CheckCheck className="size-3.5" /> Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="surface-card p-1.5 text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {notifLoading && items.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="size-5 text-text-muted" />
                <p className="mt-2 text-xs text-text-muted">No notifications</p>
              </div>
            ) : (
              URGENCY_ORDER.map((urgency) => {
                const group = groups[urgency];
                if (group.length === 0) return null;
                const meta = URGENCY_META[urgency];
                return (
                  <div key={urgency}>
                    <div className="flex items-center gap-2 mb-2">
                      <meta.icon className={`h-3.5 w-3.5 ${meta.accent}`} />
                      <span className={`text-xs font-semibold uppercase tracking-wide ${meta.accent}`}>
                        {meta.label}
                      </span>
                      <span className="text-xs text-text-muted">({group.length})</span>
                    </div>
                    <div className="space-y-2">
                      {group.map((item) => {
                        const isRead = readIds.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleMarkRead(item.id)}
                            className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                              isRead
                                ? "border-border bg-bg-surface opacity-60"
                                : "border-border bg-bg-elevated hover:bg-bg-surface"
                            }`}
                          >
                            <div className="min-w-3 flex-1">
                              <p className="text-xs font-medium text-text-primary truncate">
                                {item.title}
                              </p>
                              {item.message ? (
                                <p className="mt-0.5 text-xs text-text-muted line-clamp-2">
                                  {item.message}
                                </p>
                              ) : null}
                              {item.createdAt ? (
                                <p className="mt-1 text-xs text-text-muted">
                                  {getTimeAgo(item.createdAt)}
                                </p>
                              ) : null}
                            </div>
                            {!isRead && (
                              <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-action-primary" />
                            )}
                          </button>
                        );
                      })}
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

  if (compact) {
    return <OperatorWidgetBoundary title="OperatorNotifications">{inner}</OperatorWidgetBoundary>;
  }

  return (
    <OperatorWidgetBoundary title="OperatorNotifications">
      <div className="surface-card bg-bg-surface/40 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-action-primary" />
            <h3 className="text-sm font-semibold text-text-primary">OperatorNotifications</h3>
          </div>
          <span className="text-xs text-text-muted">{unreadCount} unread</span>
        </div>
        {inner}
      </div>
    </OperatorWidgetBoundary>
  );
}

export default OperatorNotifications;
