export interface NotificationRow {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  recipient_type: string;
  read: boolean;
  created_at: string;
}

export interface AnnouncementsResponse {
  success: boolean;
  data: Array<{
    id: string;
    title: string;
    message: string;
    priority: string;
    audience: string;
    created_at: string;
    expires_at: string | null;
  }>;
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export const NOTIF_CTA = {
  text: "Manage which notifications you receive and how.",
  href: "/settings/notifications",
  label: "Notification Settings",
} as const;
