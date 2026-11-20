/**
 * lib/notifications/actions.ts — per-type inline actions for notifications.
 *
 * The "actionable notification" multiplier: one registry declares which
 * inline actions each notification type supports + the deep-link target.
 * A notification card renders 1–2 action buttons from this registry;
 * tapping dispatches the action (RSVP, dispute, open tracker, rate…) and
 * deep-links to the owning feature.
 *
 * This is the single change that makes 8 features reachable from the
 * notification list. Tier 0 (kernel) — never forks.
 */

export type NotificationType =
  | "class_reminder"
  | "absent_marked"
  | "meal_cutoff"
  | "outpass_approved"
  | "outpass_expiring"
  | "curfew_approaching"
  | "curfew_breach"
  | "complaint_resolved"
  | "event_rsvp"
  | "event_started"
  | "event_checkin"
  | "event_feedback"
  | "weekly_digest"
  | "parent_consent"
  | "emergency_broadcast"
  | "document_verified"
  | "document_rejected"
  | "dispute_resolved"
  | "achievement_unlocked";

export interface NotificationAction {
  /** Stable action id (used by the API to dispatch). */
  id: string;
  /** Button label. */
  label: string;
  /** Which button style: primary gets the accent color. */
  variant: "primary" | "secondary" | "destructive";
  /** The deep-link to open after the action. */
  href?: string;
  /** The API endpoint the action POSTs to (omit = client-only navigation). */
  api?: string;
  /** The API method. */
  method?: "POST" | "PATCH" | "DELETE";
  /** The body to send (may be a function of the notification id). */
  body?: Record<string, unknown> | ((id: string) => Record<string, unknown>);
}

export interface NotificationTypeDef {
  type: NotificationType;
  /** Human label for the type badge. */
  label: string;
  /** The inline actions this type supports (0–3). */
  actions: NotificationAction[];
  /** The deep-link to open the owning feature. */
  deepLink: string;
}

// ── The registry ────────────────────────────────────────────────────────────
// Each type declares its actions + deep-link. A notification item of this
// type renders these buttons; the client POSTs to the api endpoint and
// then navigates to the href.

export const NOTIFICATION_ACTIONS: Record<NotificationType, NotificationTypeDef> = {
  class_reminder: {
    type: "class_reminder",
    label: "Class",
    deepLink: "/student/attendance",
    actions: [
      { id: "view", label: "View schedule", variant: "secondary", href: "/student/attendance" },
    ],
  },

  absent_marked: {
    type: "absent_marked",
    label: "Attendance",
    deepLink: "/student/attendance",
    actions: [
      { id: "dispute", label: "I was there", variant: "primary", href: "/student/attendance", api: "/api/disputes", method: "POST", body: (id) => ({ entity_type: "attendance", entity_id: id, reason: "present_but_marked_absent" }) },
      { id: "view", label: "View record", variant: "secondary", href: "/student/attendance" },
    ],
  },

  meal_cutoff: {
    type: "meal_cutoff",
    label: "Mess",
    deepLink: "/student/mess",
    actions: [
      { id: "rate", label: "Rate meal", variant: "primary", href: "/student/mess", api: "/api/meals/me/current/rating" },
      { id: "complain", label: "Something wrong", variant: "secondary", href: "/student/mess", api: "/api/meals/me/current/complaint", method: "POST" },
    ],
  },

  outpass_approved: {
    type: "outpass_approved",
    label: "Pass",
    deepLink: "/student/passes",
    actions: [
      { id: "track", label: "Live tracker", variant: "primary", href: "/student/passes" },
      { id: "qr", label: "Show QR", variant: "secondary", href: "/student/passes" },
    ],
  },

  outpass_expiring: {
    type: "outpass_expiring",
    label: "Pass",
    deepLink: "/student/passes",
    actions: [
      { id: "extend", label: "Request extension", variant: "primary", href: "/student/passes", api: "/api/passes/me/extend", method: "POST" },
      { id: "track", label: "Track", variant: "secondary", href: "/student/passes" },
    ],
  },

  curfew_approaching: {
    type: "curfew_approaching",
    label: "Curfew",
    deepLink: "/student",
    actions: [
      { id: "view", label: "Curfew status", variant: "primary", href: "/student" },
    ],
  },

  curfew_breach: {
    type: "curfew_breach",
    label: "Curfew",
    deepLink: "/student",
    actions: [
      { id: "view", label: "See details", variant: "primary", href: "/student" },
    ],
  },

  complaint_resolved: {
    type: "complaint_resolved",
    label: "Complaint",
    deepLink: "/student/complaints",
    actions: [
      { id: "rate", label: "Rate resolution", variant: "primary", href: "/student/complaints", api: "/api/complaints/me/rate", method: "POST" },
    ],
  },

  event_rsvp: {
    type: "event_rsvp",
    label: "Event",
    deepLink: "/student/campus",
    actions: [
      { id: "going", label: "Going", variant: "primary", href: "/student/campus", api: "/api/events/me/rsvp", method: "POST", body: (id) => ({ event_id: id, status: "going" }) },
      { id: "not", label: "Not going", variant: "secondary", api: "/api/events/me/rsvp", method: "POST", body: (id) => ({ event_id: id, status: "not_going" }) },
    ],
  },

  event_started: {
    type: "event_started",
    label: "Event",
    deepLink: "/student/campus",
    actions: [
      { id: "checkin", label: "Check in", variant: "primary", href: "/student/campus", api: "/api/events/me/checkin", method: "POST" },
    ],
  },

  event_checkin: {
    type: "event_checkin",
    label: "Event",
    deepLink: "/student/campus",
    actions: [
      { id: "track", label: "Live track", variant: "primary", href: "/student/campus" },
    ],
  },

  event_feedback: {
    type: "event_feedback",
    label: "Event",
    deepLink: "/student/campus",
    actions: [
      { id: "rate", label: "Leave feedback", variant: "primary", href: "/student/campus" },
    ],
  },

  weekly_digest: {
    type: "weekly_digest",
    label: "Digest",
    deepLink: "/student/recap",
    actions: [
      { id: "view", label: "View recap", variant: "primary", href: "/student/recap" },
    ],
  },

  parent_consent: {
    type: "parent_consent",
    label: "Consent",
    deepLink: "/student/passes",
    actions: [
      { id: "view", label: "View pass", variant: "primary", href: "/student/passes" },
    ],
  },

  emergency_broadcast: {
    type: "emergency_broadcast",
    label: "Emergency",
    deepLink: "/student",
    actions: [
      { id: "ack", label: "Acknowledge", variant: "primary", href: "/student" },
    ],
  },

  document_verified: {
    type: "document_verified",
    label: "Document",
    deepLink: "/student/profile",
    actions: [
      { id: "view", label: "View document", variant: "primary", href: "/student/profile" },
    ],
  },

  document_rejected: {
    type: "document_rejected",
    label: "Document",
    deepLink: "/student/profile",
    actions: [
      { id: "reupload", label: "Re-upload", variant: "primary", href: "/student/profile", api: "/api/documents/me/reupload", method: "POST" },
      { id: "dispute", label: "I disagree", variant: "secondary", href: "/student/profile", api: "/api/disputes", method: "POST", body: (id) => ({ entity_type: "document", entity_id: id, reason: "rejection_disputed" }) },
    ],
  },

  dispute_resolved: {
    type: "dispute_resolved",
    label: "Dispute",
    deepLink: "/student/profile",
    actions: [
      { id: "view", label: "See resolution", variant: "primary", href: "/student/profile" },
    ],
  },

  achievement_unlocked: {
    type: "achievement_unlocked",
    label: "Achievement",
    deepLink: "/student/achievements",
    actions: [
      { id: "view", label: "View proof", variant: "primary", href: "/student/achievements" },
    ],
  },
};

/** Get the action definition for a notification type. */
export function getNotificationActions(type: string): NotificationTypeDef | undefined {
  return (NOTIFICATION_ACTIONS as Record<string, NotificationTypeDef>)[type];
}

export default NOTIFICATION_ACTIONS;
