/**
 * Zustand notification store — persists per-user notification read state
 * across page refreshes. Groups alerts by urgency (urgent / approval /
 * info / overdue) and tracks a persisted set of read notification IDs so
 * the NotificationCenter unread badge survives reloads.
 *
 * The store is intentionally decoupled from the API layer: it only tracks
 * read state and a lightweight in-memory alert cache. Data fetching lives
 * in the NotificationCenter component (via useApiResource + usePolling).
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type NotificationUrgency = "urgent" | "approval" | "info" | "overdue";

export interface NotificationItem {
  id: string;
  urgency: NotificationUrgency;
  title: string;
  message?: string;
  createdAt?: string;
  /** Stable identifier used for read-state tracking (may be a ticket number). */
  ticketNumber?: string;
  read?: boolean;
}

interface NotificationState {
  items: NotificationItem[];
  /** Persisted set of notification IDs the user has marked read. */
  readIds: string[];
  /** IDs the user has read but that aren't in the current fetched set. */
  staleReadIds?: string[];

  setItems: (items: NotificationItem[]) => void;
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
  isRead: (id: string) => boolean;
  unreadCount: (items: NotificationItem[]) => number;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      items: [],
      readIds: [],

      setItems: (items) => set({ items }),
      markRead: (id) =>
        set((state) => ({
          readIds: state.readIds.includes(id)
            ? state.readIds
            : [...state.readIds, id],
        })),
      markAllRead: (ids) =>
        set((state) => ({
          readIds: Array.from(new Set([...state.readIds, ...ids])),
        })),
      isRead: (id) => get().readIds.includes(id),
      unreadCount: (items) =>
        items.filter((n) => !get().readIds.includes(n.id)).length,
    }),
    {
      name: "gate-monitor-notifications",
      storage: createJSONStorage(
        () =>
          typeof window !== "undefined"
            ? localStorage
            : {
                getItem: () => null,
                setItem: () => {},
                removeItem: () => {},
              }
      ),
      partialize: (state) => ({
        readIds: state.readIds,
      }),
    }
  )
);

/**
 * Derive notification items from the two source endpoints:
 *  - /api/permissions (overdue = sla_deadline in the past AND status PENDING)
 *  - /api/alerts (grouped by severity: critical/high → urgent,
 *                 permission → approval, low/medium → info)
 *
 * Returns NotificationItem[] ready for the store.
 */
export function deriveNotifications(
  permissionRows: Array<Record<string, unknown>> | null,
  alertRows: Array<Record<string, unknown>> | null
): NotificationItem[] {
  const now = Date.now();
  const out: NotificationItem[] = [];

  // Overdue permission requests
  if (Array.isArray(permissionRows)) {
    for (const row of permissionRows) {
      const status = String(row.status ?? "");
      if (status !== "PENDING") continue;
      const slaDeadline = row.sla_deadline ? new Date(String(row.sla_deadline)).getTime() : null;
      if (!slaDeadline || slaDeadline > now) continue;

      const ticket = String(row.ticket_number ?? "");
      const workflow = String(row.workflow_type ?? "permission");
      out.push({
        id: `perm-overdue-${ticket}`,
        urgency: "overdue",
        title: `Overdue: ${ticket} (${workflow})`,
        message: `${workflow} request past SLA deadline`,
        createdAt: slaDeadline ? new Date(slaDeadline).toISOString() : undefined,
        ticketNumber: ticket,
      });
    }
  }

  // Pending permission requests (approval bucket)
  if (Array.isArray(permissionRows)) {
    for (const row of permissionRows) {
      const status = String(row.status ?? "");
      if (status !== "PENDING") continue;
      const slaDeadline = row.sla_deadline ? new Date(String(row.sla_deadline)).getTime() : null;
      if (slaDeadline && slaDeadline < now) continue; // already overdue, skip

      const ticket = String(row.ticket_number ?? "");
      const workflow = String(row.workflow_type ?? "permission");
      const studentName = (row.student as { name?: string } | null)?.name ?? "Unknown";
      out.push({
        id: `perm-pending-${ticket}`,
        urgency: "approval",
        title: `${workflow} approval pending: ${ticket}`,
        message: `${studentName}'s ${workflow} request awaiting decision`,
        createdAt: row.created_at ? String(row.created_at) : undefined,
        ticketNumber: ticket,
      });
    }
  }

  // Alerts
  if (Array.isArray(alertRows)) {
    for (const row of alertRows) {
      const severity = String(row.severity ?? "info").toLowerCase();
      const urgency: NotificationUrgency =
        severity === "critical" || severity === "high"
          ? "urgent"
          : severity === "permission" || severity === "medium"
          ? "approval"
          : "info";

      out.push({
        id: `alert-${String(row.id ?? "unknown")}`,
        urgency,
        title: String(row.title ?? row.message ?? "System alert"),
        message: String(row.message ?? ""),
        createdAt: row.timestamp ? String(row.timestamp) : undefined,
      });
    }
  }

  return out;
}
