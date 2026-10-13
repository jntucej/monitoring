"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState } from "react";
import { Search, ChevronDown, BookOpen, Shield, Users, Settings, FileText, DoorOpen, Bell, AlertCircle } from "lucide-react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

type LucideIcon = ForwardRefExoticComponent<Omit<React.SVGProps<SVGSVGElement>, "ref"> & RefAttributes<SVGSVGElement>>;

export interface HelpArticle {
  id: string;
  title: string;
  summary: string;
  icon: LucideIcon;
  category: string;
  minTier: number;
  visibleToRoles?: string[];
  body: string[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  DoorOpen,
  Bell,
  AlertCircle,
  BookOpen,
  Shield,
  Users,
  Settings,
  Search,
  ChevronDown,
};

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? FileText;
}

export const ARTICLES: HelpArticle[] = [
    /* night-curfew */
  {
    id: "night-curfew",
    title: "Night Curfew",
    summary: "How wardens enforce the residential night curfew and log curfew violations at the gate.",
    icon: DoorOpen,
    category: "Gate operations",
    minTier: 60,
    visibleToRoles: ["sysadmin", "admin", "principal", "warden", "deputy_warden"],
    body: [
      "Curfew window: All residential students must be on campus before 22:00 and must leave the residential zone no later than 22:30 for nightly lockdown. Wardens confirm the gate is fully sealed by 23:00 every night.",
      "At 22:00, the gate kiosk switches to curfew mode and begins denying outbound scans for students whose dorm pass is not active. Wardens should verify the kiosk status light shows CURFEW in the monitoring feed.",
      "Any student not yet on campus at 23:00 is a curfew breach. The warden contacts the student via the campus app, checks the student's check-in history for the day, and logs the breach on the night-shift board.",
      "Log every breach with the student's name, block, time, and reason (late lab, medical, etc.). Breaches that cannot be explained within 2 hours must be escalated to the duty principal on call.",
      "At lockdown (22:30), all inner dorm gates are latched by caretaker teams. The warden walks the block map once before 23:15 and confirms every dorm door reads LOCKED on the dashboard.",
      "Exceptions: Approved evening work or approved medical leave lets a student stay past curfew — the approval must appear on the gate kiosk before 21:00. Document every exception on the shift report before handover.",
    ],
  },
    /* emergency-protocol */
  {
    id: "emergency-protocol",
    title: "Emergency Protocol",
    summary: "Step-by-step response procedure for fire, medical, security, and gas-emergency alerts.",
    icon: AlertCircle,
    category: "Emergency",
    minTier: 40,
    visibleToRoles: ["sysadmin", "admin", "principal", "warden", "deputy_warden", "guard", "caretaker"],
    body: [
      "On any critical alert, immediately broadcast the all-clear/emergency code over the PA system and confirm the monitoring wall has escalated to the duty principal on call.",
      "Fire: Activate the nearest fire hose point and evacuate the affected block using marked exit routes. Guards take position at each evacuation assembly point and run a head-count against the live occupancy board.",
      "Medical: Call the infirmary first; if the patient is unconscious or the situation is life-threatening, dial 112 and position a guard at the main gate to guide the ambulance.",
      "Security threat: Lock down the nearest gate, keep the crowd in place, and do NOT open the gate for anyone until the warden and principal confirm the threat level and identity.",
      "Gas/chemical: Stop all vehicles, open the gate to upwind exits only, and evacuate to the open-air assembly ground away from wind direction.",
      "After the incident, file a written report with timeline, actions, and casualties within 1 hour. Retain CCTV footage for 30 days and log any system faults raised by monitoring in the incident tracker.",
    ],
  },
  /* gate-access-rules */
  {
    id: "gate-access-rules",
    title: "Gate Access Rules",
    summary: "Standard entry/exit rules for students, staff, visitors, and operators at all gates.",
    icon: DoorOpen,
    category: "Gate operations",
    minTier: 40,
    visibleToRoles: ["sysadmin", "admin", "principal", "warden", "deputy_warden", "guard", "operator", "staff"],
    body: [
      "Entry hours: Main gate 07:00–21:00; evening gate 18:00–23:00. Outside these windows, entry requires a valid late-night pass issued by the warden before 21:00.",
      "Students: Present the campus ID card (or QR pass on the mobile app) at the reader. If the badge reader fails, a guard manually checks the student against the live enrollment list and grants a 15-minute grace entry.",
      "Staff: Staff badges are registered under their department. Visitors must be pre-booked by the host 2 hours before arrival; walk-in visitors are logged on the visitor register and shown to the host within 10 minutes.",
      "Vehicles: Vehicle plates are read by ANPR on entry. Unregistered vehicles on campus for more than 30 minutes are flagged to the warden for a spot check. Two-wheelers must use the two-wheeler lane only.",
      "Exit checks: Exit is permitted only if the student's day is active in the attendance system. During examination week, exits between 09:00 and 16:00 require an examination permit card.",
      "Disputes: Any access denial is logged by the gate operator with a photo timestamp. The student or parent may appeal to the warden within 24 hours.",
    ],
  },
  /* mess-preference */
  {
    id: "mess-preference",
    title: "Mess Food Preference Guide",
    summary: "How to set and update dietary preferences and mess hall choice in the student dashboard.",
    icon: Users,
    category: "Student services",
    minTier: 30,
    visibleToRoles: ["sysadmin", "admin", "principal", "student", "parent", "hod"],
    body: [
      "Open the student dashboard and navigate to 'Hostel & Mess'. Under 'Mess Hall', select your preferred hall (South Mess / North Mess). Changes take effect from the next billing cycle.",
      "Under 'Dietary Preferences', set your base diet: Veg, Mixed, or Non-Veg. You can also mark 'Light' or 'Regular' portion size for dinner to reduce food waste.",
      "Allergy and medical restrictions (e.g., no peanut, lactose-free, gluten-free) must be entered under 'Medical Restrictions'. These are forwarded to the mess in-charge and are NOT shown to the general mess staff for safety.",
      "Preference changes are free up to 15 days before the next cycle. Changes made less than 15 days in advance are subject to a ₹100 charge and take effect in the following cycle.",
      "If you are temporarily away (leave, home visit), log a 'No Meal' day against your absence so you are not billed for meals you do not consume. No-meal days are capped at 5 per month.",
      "Your preferences are visible to hostel staff and the warden; the mess in-charge sees the aggregated dietary counts for the block. To dispute a meal-charge entry, file a ticket under 'Billing' with a date reference.",
    ],
  },
  /* operator-kiosk */
  {
    id: "operator-kiosk",
    title: "Operator Kiosk Guide",
    summary: "Day-to-day operations and troubleshooting for gate kiosk staff.",
    icon: Settings,
    category: "Operations",
    minTier: 20,
    visibleToRoles: ["sysadmin", "admin", "principal", "operator", "guard"],
    body: [
      "Start of shift: Confirm the kiosk screen boots to 'Ready' state, the badge reader LED is green, and the video feed shows the approach lane clearly. If any of these fail, raise a kiosk fault ticket before the first scan.",
      "Normal scan: The badge reader reads the card or QR in under 2 seconds. A green chime means permitted entry; a red chime means the gate is denying access — record the reason code shown on the kiosk screen in the shift log.",
      "Denial codes: EXPIRED-PASS means the student's residential pass has lapsed; LOCKDOWN means the curfew or emergency gate state is active; NO-ENROLLMENT means the card is not registered to the system. All three are escalated to the warden, not overridden manually.",
      "Override: Only the warden or duty principal can authorise a manual override. The operator must record the authoriser's name, time, and the student's reason for the override before granting physical access.",
      "End of shift: Tally entries/exits against the monitoring feed, print the shift summary, and hand over to the next operator along with any open kiosk fault tickets. The kiosk audit log auto-uploads to the monitoring backend — no manual export is needed.",
    ],
  },
  /* student-dashboard */
  {
    id: "student-dashboard",
    title: "Student Dashboard Guide",
    summary: "What the student dashboard shows and how to act on attendance, alerts, and leave requests.",
    icon: BookOpen,
    category: "Student services",
    minTier: 30,
    visibleToRoles: ["sysadmin", "admin", "student", "parent", "principal"],
    body: [
      "The dashboard home tile shows your today's attendance status (In / Out / Pending) and your 7-day attendance %. If attendance is below 75%, a red warning banner appears and the academic office is notified automatically.",
      "Under 'Alerts', you will see any curfew breach, gate denial, or late-night entry recorded against you. You can add a note on each alert to explain your absence or late entry — notes are reviewed by the warden within 48 hours.",
      "To apply for leave (study leave, medical leave, home leave), use 'Leave Requests'. Enter the expected absence window and upload the supporting document (medical certificate for medical leave). Leave is approved by the warden or principal depending on length.",
      "Your gate pass status is visible under 'Access'. If your pass shows EXPIRED, renew it through the hostel section before 21:00 on the last valid day to avoid a night gate denial.",
      "Monthly fee, mess charges, and hostel dues are itemised under 'Billing'. Payments go through the parent dashboard — students do not pay directly from the student account.",
      "If the dashboard shows an error, a blank tile, or data that does not match your experience, tap 'Report an issue' on the tile. Support tickets are answered within 1 working day.",
    ],
  },
  /* admin-roles */
  {
    id: "admin-roles",
    title: "Admin & Security Role Permissions",
    summary: "What each role tier can do in the monitoring system, and who to contact for access changes.",
    icon: Shield,
    category: "Administration",
    minTier: 90,
    visibleToRoles: ["sysadmin", "admin"],
    body: [
      "Role tiers: sysadmin (100) has full system access including role management, audit logs, and system configuration. admin (95) manages everything under the principal's authority except system configuration.",
      "principal (90) and vice_principal (85) approve leave, curfew exceptions, and incident reports. They can view all incident and attendance dashboards but cannot modify role assignments or system settings.",
      "exam_branch (80) and oie (75) manage examination-related gate holds, result publication triggers, and examination-week access rules. hostel_manager (70) manages mess halls, block allocations, and hostel billing rules.",
      "warden (60) and deputy_warden (65) enforce night curfew, approve gate overrides, and file incident reports. guard (20) and operator (20) are limited to their shift scope — entry/exit logging, kiosk operation, and alert acknowledgment only.",
      "Access changes: To request a new role or access, file an access request to the sysadmin via the admin dashboard. Requests are approved by the principal and logged in the audit trail. Access grants are scoped to a duration and expire automatically.",
      "The 'guard' role has limited visibility: they cannot view attendance analytics, financial data, or other students' personal information. If you believe you have been granted a role by mistake, contact sysadmin for an immediate revocation request.",
    ],
  },
  /* alert-handling */
  {
    id: "alert-handling",
    title: "Alert Handling & Escalation",
    summary: "How alerts flow through the monitoring system, acknowledgment rules, and escalation paths.",
    icon: Bell,
    category: "Operations",
    minTier: 40,
    visibleToRoles: ["sysadmin", "admin", "principal", "warden", "deputy_warden", "guard", "caretaker", "staff"],
    body: [
      "Alerts are generated by the monitoring system on: gate anomaly, device offline, occupancy mismatch, curfew breach, and emergency sensor triggers. Each alert is assigned a severity — Informational, Warning, or Critical.",
      "Informational alerts do not require acknowledgment. Warning alerts must be acknowledged by an on-duty warden or guard within 30 minutes. Critical alerts must be acknowledged within 5 minutes or they auto-escalate to the duty principal on call.",
      "To acknowledge an alert: open the monitoring wall, tap the alert, select 'Acknowledge' and enter a short note describing what you observed. The note becomes part of the incident record and cannot be edited after acknowledgment.",
      "If a Critical alert persists for more than 10 minutes after acknowledgment, the system re-escalates to the principal and, if unresolved within 15 minutes, to the sysadmin. Repeated unacknowledged alerts in a 24-hour window are flagged as a system health concern.",
      "After resolution, file a resolution note describing root cause and corrective action. Alerts with root cause 'device fault' are auto-forwarded to the operations queue for technician follow-up within 4 hours.",
      "Review the weekly alert report every Monday under 'Reports'. Recurring alert patterns (same gate, same time) are indicators of a hardware issue or a process gap — raise a process-improvement ticket to the warden for action.",
    ],
  },
  // SCAFFOLD:HELP -- new articles are injected above this line
];

function getRoleTier(role: string): number {
  const t: Record<string, number> = {
    sysadmin: 100,
    admin: 95,
    principal: 90,
    vice_principal: 85,
    exam_branch: 80,
    oie: 75,
    hostel_manager: 70,
    deputy_warden: 65,
    caretaker: 55,
    hod: 50,
    staff: 45,
    worker: 40,
    student: 30,
    parent: 25,
    visitor: 10,
    guard: 20,
    operator: 20,
  };
  return t[role] ?? 0;
}

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Mock user -- in real app, pull from auth store
  const user = { role: "sysadmin", id: "demo" };
  const tier = getRoleTier(user.role);

  const visible = useMemo(() => {
    return ARTICLES.filter((a) => {
      if (tier < a.minTier) return false;
      if (a.visibleToRoles && !a.visibleToRoles.includes(user.role)) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q);
    });
  }, [query, tier]);

  const grouped = useMemo(() => {
    const groups: Record<string, HelpArticle[]> = {};
    for (const a of visible) {
      groups[a.category] = groups[a.category] || [];
      groups[a.category].push(a);
    }
    return groups;
  }, [visible]);

  if (!visible.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <Search className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
        <h2 className="mt-4 text-lg font-semibold">No articles found</h2>
        <p className="mt-1 text-[var(--text-muted)]">Try a different search or contact your administrator.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6 min-w-0">
      {/* Page title — global DynamicHeader renders the app header */}
      <div>
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">Help Center</p>
        <p className="mt-1 text-[var(--text-muted)]">
          Role-scoped documentation for <span className="font-mono">{user.role}</span> (tier {tier})
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
        <input
          type="search"
          placeholder="Search articles..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
      </div>

      <div className="space-y-6" role="list">
        {Object.entries(grouped).map(([category, articles]) => (
          <section key={category} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {category}
            </h2>
            {articles.map((a) => (
              <article
                key={a.id}
                className="group rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden transition-shadow hover:shadow-lg"
              >
                <button
                  onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                  className="w-full p-4 flex items-start gap-3 text-left"
                  aria-expanded={expanded === a.id}
                >
                  <a
                    href="#"
                    className="flex-shrink-0 h-10 w-10 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <a.icon className="h-5 w-5" />
                  </a>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{a.title}</h3>
                    <p className="mt-0.5 text-[13px] text-[var(--text-muted)] line-clamp-1">
                      {a.summary}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                      <span className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] font-mono">
                        Tier ≥ {a.minTier}
                      </span>
                      {a.visibleToRoles && (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)]">
                          {a.visibleToRoles.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    className={"flex-shrink-0 h-4 w-4 text-[var(--text-muted)] transition-transform " + (expanded === a.id ? "rotate-180" : "")}
                  />
                </button>

                {expanded === a.id && (
                  <div className="border-t border-[var(--border)] px-4 pb-4 text-[var(--text-secondary)] text-sm space-y-2">
                    {a.body.map((step, i) => (
                      <p key={i} className="flex gap-2">
                        <span className="flex-shrink-0 font-mono text-[var(--text-muted)]">
                          {i + 1}.
                        </span>
                        {step}
                      </p>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
