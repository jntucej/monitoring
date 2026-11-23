/**
 * PR-05A · §13 — notification → entity inspector bridge.
 *
 * A notification is not a dead "mark read" object. When it references a
 * record (a permission/approval ticket, or an emergency alert), clicking it
 * should open the shared entity inspector so the SAME entity reference is
 * reusable everywhere (dashboard / notification / search / table / chart →
 * one inspector → decision). Honest: only the fields the notification row
 * actually carries are shown; no invented relationships.
 */
import type {
  EntityInspection,
  InspectionSection,
} from "@/components/shared/EntityInspector";

export interface NotificationItem {
  id: string;
  urgency: string;
  type?: string;
  title: string;
  message?: string;
  createdAt?: string;
  /** Stable identifier (often the ticket number) used for read-state. */
  ticketNumber?: string;
  read?: boolean;
}

function when(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function kv(pairs: Array<[string, React.ReactNode]>): InspectionSection {
  return {
    title: "Overview",
    content: (
      <dl className="space-y-1.5">
        {pairs.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-text-muted">{k}</dt>
            <dd className="text-sm text-text-primary">{v}</dd>
          </div>
        ))}
      </dl>
    ),
  };
}

function nav(href: string, label: string): InspectionSection {
  return {
    title: "Action",
    content: (
      <a
        href={href}
        className="text-sm text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
      >
        {label} →
      </a>
    ),
  };
}

/**
 * Build an inspection from a notification item. Returns null when the item
 * carries no referenceable record (info-only notifications stay inspect-only
 * as a lightweight overview — never invent an entity).
 */
export function buildNotificationInspection(
  item: NotificationItem,
): EntityInspection | null {
  const isTicket = Boolean(item.ticketNumber);
  const isAlert = item.id?.startsWith("alert-");
  if (!isTicket && !isAlert) return null;

  const title = item.title ?? item.type ?? "Notification";
  const sections: InspectionSection[] = [
    kv([
      ["Kind", item.urgency ? `${item.urgency}` : "—"],
      ["Type", item.type ?? "—"],
      ["Reported", when(item.createdAt)],
      [isTicket ? "Ticket" : "Alert", isTicket ? item.ticketNumber : item.id.replace(/^alert-/, "")],
    ]),
  ];

  if (item.message) {
    sections.push({
      title: "Details",
      content: <p className="text-sm text-text-secondary">{item.message}</p>,
    });
  }

  // Honest action link: only to a real destination the record can reach.
  if (isTicket) {
    sections.push(
      nav(
        `/permissions/${encodeURIComponent(item.ticketNumber ?? "")}`,
        "Open permission record",
      ),
    );
  } else if (isAlert) {
    sections.push(
      nav("/principal/operations/incidents", "View incident register"),
    );
  }

  return {
    kind: isAlert ? "notification.alert" : "notification.permission",
    title,
    subtitle: item.ticketNumber ?? undefined,
    status: (
      <span className="text-xs font-semibold text-text-muted">
        {item.urgency?.toUpperCase() ?? "NOTIFIED"}
      </span>
    ),
    sections,
  };
}
