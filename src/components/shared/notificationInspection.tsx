/**
 * notificationInspection — the shared inspection model builder for
 * notification entities.
 *
 * Both the Principal NotificationCenter (PrincipalNotificationCenter) and the
 * shared NotificationBell need to map a notification row onto the standardized
 * EntityInspection contract. This module is the single source of truth for
 * that mapping so the two surfaces never drift.
 *
 * The model is data-agnostic: it takes a `NotificationInspectionSource`
 * (the minimal fields any notification row carries) and returns an
 * `EntityInspection` ready for the `EntityInspector` drawer.
 */

import type { EntityInspection } from "@/components/shared/EntityInspector";

/** The minimal fields a notification row must carry to build an inspection. */
export interface NotificationInspectionSource {
  /** Stable id for deduplication. */
  id: string;
  /** Display title. */
  title: string;
  /** Body / detail text. */
  message?: string;
  /** The referenced ticket number, if any. */
  ticketNumber?: string;
  /** Urgency bucket (drives the status badge color). */
  urgency?: "urgent" | "overdue" | "approval" | "info";
  /** Raw notification type (drives the entity-kind resolution). */
  type?: string;
  /** ISO timestamp. */
  createdAt?: string;
  /**
   * Role-appropriate depth: when true the Actions section includes an
   * "Open in approvals" CTA for ticket-related notifications.
   */
  canActOnTickets?: boolean;
}

/**
 * Resolve the entity kind for a notification.
 *
 * Ticket-related types (pass, permission, entry, exit) map to
 * "permission ticket"; alert types map to "alert"; everything else
 * maps to the raw type string.
 */
export function resolveNotificationKind(
  type: string | undefined,
  ticketNumber: string | undefined
): string {
  if (ticketNumber) return "permission ticket";
  const t = (type ?? "").toLowerCase();
  if (
    t.includes("pass") ||
    t.includes("permission") ||
    t.includes("entry") ||
    t.includes("exit")
  ) {
    return "permission ticket";
  }
  if (t.includes("alert") || t.includes("emergency") || t.includes("incident")) {
    return "alert";
  }
  return type ?? "notification";
}

/**
 * Build the EntityInspection model for a notification row.
 *
 * Sections: What (overview) → Context (data payload) → Actions
 * (open in approvals / attention queue when ticket-related).
 */
export function buildNotificationInspection(
  n: NotificationInspectionSource
): EntityInspection {
  const kind = resolveNotificationKind(n.type, n.ticketNumber);
  const isTicketRelated = kind === "permission ticket";

  const statusTone =
    n.urgency === "urgent"
      ? "bg-red-500/10 text-red-600"
      : n.urgency === "overdue"
        ? "bg-amber-500/10 text-amber-600"
        : "bg-bg-elevated text-text-muted";

  const actions: React.ReactNode[] = [];
  if (isTicketRelated && n.ticketNumber && n.canActOnTickets) {
    actions.push(
      <a
        key="open-approval"
        href={`/principal/approvals?ticket=${encodeURIComponent(n.ticketNumber)}`}
        className="inline-flex min-h-8 items-center rounded bg-action-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
      >
        Open in approvals
      </a>
    );
  }
  actions.push(
    <a
      key="attention"
      href="/principal/attention"
      className="inline-flex min-h-8 items-center rounded bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
    >
      Attention queue
    </a>
  );

  return {
    kind,
    title: n.title,
    subtitle: n.ticketNumber ?? undefined,
    status: (
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${statusTone}`}>
        {n.urgency ?? "info"}
      </span>
    ),
    sections: [
      {
        title: "What",
        content: (
          <dl className="grid grid-cols-1 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Detail</dt>
              <dd className="mt-0.5 text-text-primary">
                {n.message || n.title}
              </dd>
            </div>
            {n.createdAt ? (
              <div>
                <dt className="text-text-muted">Raised</dt>
                <dd className="mt-0.5 text-text-primary">
                  {new Date(n.createdAt).toLocaleString()}
                </dd>
              </div>
            ) : null}
          </dl>
        ),
      },
      {
        title: "Actions",
        content: <div className="flex flex-wrap gap-2">{actions}</div>,
      },
    ],
  };
}
