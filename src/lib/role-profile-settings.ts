/**
 * role-profile-settings — occasional, role-specific operational settings
 * mounted inside each role's profile page.
 *
 * Pure function. No React, no hooks.
 */

export interface OccasionalSettingItem {
  id: string;
  title: string;
  whenToSet: string;
  description: string;
  controlType: "toggle" | "select" | "link";
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | boolean;
  href?: string;
}

export function getOccasionalProfileSettings(
  role: string | undefined,
): OccasionalSettingItem[] {
  const r = (role ?? "student").toLowerCase();

  if (r === "student") {
    return [
      {
        id: "student-consent-review",
        title: "Data Consent & Privacy Scopes",
        whenToSet: "Set once per semester or before sharing profile/activity data",
        description:
          "Review and toggle optional data-sharing scopes and privacy preferences.",
        controlType: "link",
        href: "/student/profile/privacy",
      },
      {
        id: "student-session-hygiene",
        title: "Active Devices & Sessions",
        whenToSet: "Check occasionally or after using a shared/lab device",
        description:
          "Inspect recent login activity and sign out of other active sessions.",
        controlType: "link",
        href: "/student/profile-security/sessions",
      },
      {
        id: "student-mess-digest",
        title: "Meal & Mess Reminder Cadence",
        whenToSet: "Adjust when mess timings or dining habits change",
        description:
          "Choose how often you receive meal/special-item and billing reminders.",
        controlType: "select",
        defaultValue: "daily-evening",
        options: [
          { label: "Daily Evening Summary", value: "daily-evening" },
          { label: "Important Changes Only", value: "important-only" },
          { label: "Off", value: "off" },
        ],
      },
    ];
  }

  if (r === "guardian" || r === "parent") {
    return [
      {
        id: "guardian-alert-channel",
        title: "Ward Movement & Pass Alerts",
        whenToSet:
          "Set when your ward travels, stays on leave, or changes schedule",
        description:
          "Configure notification channels and quiet hours for ward gate and pass updates.",
        controlType: "link",
        href: "/settings/notifications",
      },
      {
        id: "guardian-default-ward-view",
        title: "Default Ward Summary Focus",
        whenToSet: "Update if you monitor multiple wards or priorities shift",
        description:
          "Pick which ward check matters most when opening guardian views.",
        controlType: "select",
        defaultValue: "movement",
        options: [
          { label: "Gate Movement First", value: "movement" },
          { label: "Attendance & Academics", value: "attendance" },
          { label: "Pass & Leave Requests", value: "requests" },
        ],
      },
    ];
  }

  if (r === "operator") {
    return [
      {
        id: "operator-kiosk-pin",
        title: "Kiosk PIN & Terminal Session",
        whenToSet:
          "Set when configuring an unattended gate terminal or rotating PINs",
        description:
          "Manage kiosk session access and gate assignment claim flow.",
        controlType: "link",
        href: "/operator/kiosk-pin",
      },
      {
        id: "operator-scan-beep",
        title: "Scan Confirmation Chime",
        whenToSet: "Toggle based on gate noise level or shift preference",
        description: "Play a subtle confirmation tone on valid gate scans.",
        controlType: "toggle",
        defaultValue: true,
      },
      {
        id: "operator-flag-confirm",
        title: "Strict Flag & Curfew Prompt",
        whenToSet: "Adjust during night curfew or exam-day gate checks",
        description:
          "Always require deliberate confirmation on flagged or out-of-window scans.",
        controlType: "toggle",
        defaultValue: true,
      },
    ];
  }

  if (["caretaker", "worker", "mess_incharge"].includes(r)) {
    return [
      {
        id: "field-shift-handover-nudge",
        title: "End-of-Shift Handover Reminder",
        whenToSet: "Set once when your shift timing is assigned",
        description:
          "Remind you to log pending notes/tasks before shift change.",
        controlType: "toggle",
        defaultValue: true,
      },
      {
        id: "field-priority-filter",
        title: "Default Queue Sort",
        whenToSet: "Change during peak rush hours or backlog cleanup",
        description:
          "Choose how open tickets or tasks are ordered by default.",
        controlType: "select",
        defaultValue: "sla-urgent",
        options: [
          { label: "Urgent / SLA First", value: "sla-urgent" },
          { label: "Newest First", value: "newest" },
          { label: "By Block / Location", value: "location" },
        ],
      },
    ];
  }

  if (
    [
      "faculty",
      "hod",
      "deputy_warden",
      "hostel_manager",
      "emo",
      "exam_branch",
      "oie",
      "exam_superintendent",
      "staff",
    ].includes(r)
  ) {
    return [
      {
        id: "approver-digest-mode",
        title: "Approval Queue Digest Cadence",
        whenToSet:
          "Adjust during exam weeks, semester start, or leave periods",
        description:
          "Control how frequently pending queue summaries notify you.",
        controlType: "select",
        defaultValue: "twice-daily",
        options: [
          { label: "Real-Time on Escalation", value: "realtime-escalation" },
          { label: "Morning & Afternoon Digest", value: "twice-daily" },
          { label: "End-of-Day Summary", value: "end-of-day" },
        ],
      },
      {
        id: "approver-sla-warning",
        title: "SLA Breach Pre-Warning",
        whenToSet: "Set once for your approval stage workflow",
        description:
          "Highlight tickets approaching their stage SLA deadline.",
        controlType: "toggle",
        defaultValue: true,
      },
      {
        id: "approver-notif-prefs",
        title: "Channel & Quiet Hours",
        whenToSet: "Update before holidays, classes, or exam invigilation",
        description:
          "Manage email, app, and quiet-hour notification rules.",
        controlType: "link",
        href: "/settings/notifications",
      },
    ];
  }

  if (["vice_principal", "principal", "supervisor", "admin"].includes(r)) {
    return [
      {
        id: "exec-escalation-threshold",
        title: "Executive Escalation Highlight",
        whenToSet: "Adjust when tightening campus security or SLA response",
        description:
          "Surface overdue and escalated items prominently in oversight views.",
        controlType: "toggle",
        defaultValue: true,
      },
      {
        id: "exec-delegation-link",
        title: "Delegation & Handoff Rules",
        whenToSet:
          "Set before going on travel, leave, or temporary reassignment",
        description:
          "Review active approval delegations and authority handoffs.",
        controlType: "link",
        href:
          r === "vice_principal"
            ? "/vice-principal/delegated-responsibilities"
            : "/principal/governance/delegations",
      },
      {
        id: "exec-notif-prefs",
        title: "Notification Channels & Quiet Hours",
        whenToSet: "Update whenever alert routing or on-call hours change",
        description: "Configure alert channels and quiet windows.",
        controlType: "link",
        href: "/settings/notifications",
      },
    ];
  }

  // Tier 4: sysadmin
  return [
    {
      id: "sys-session-review",
      title: "Active Admin Sessions & Revocation",
      whenToSet:
        "Check periodically or after infrastructure/credential changes",
      description:
        "Inspect active sessions and revoke stale or suspicious sessions.",
      controlType: "link",
      href: "/sysadmin/sessions",
    },
    {
      id: "sys-audit-review",
      title: "Audit Log & Security Posture",
      whenToSet: "Review after policy, role, or gate/device changes",
      description: "Jump to audit logs or security posture checks.",
      controlType: "link",
      href: "/sysadmin/audit",
    },
    {
      id: "sys-alert-routing",
      title: "System Alert Channels",
      whenToSet: "Update when on-call rotation or alert channels change",
      description: "Configure notification preferences for system events.",
      controlType: "link",
      href: "/settings/notifications",
    },
  ];
}
