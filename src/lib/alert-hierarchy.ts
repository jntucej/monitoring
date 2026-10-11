/**
 * Alert hierarchy catalogue — role-tier aware alerts.
 * Generated entries injected via scripts/scaffold.mjs
 */

export type AlertSeverity = "critical" | "high" | "medium" | "low";

export interface AlertDefinition {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  minTier: number;
  visibleToRoles?: string[];
  condition: (ctx: AlertContext) => boolean;
  href?: string;
  ctaLabel?: string;
}

export interface AlertContext {
  role: string;
  userId: string;
  gateId: string | null;
  departmentId: string | null;
  assignedHostel: string | null;
  metrics: Record<string, number>;
}

export const ALERT_CATALOGUE: AlertDefinition[] = [
    /* warden.overdue */
  {
    id: "warden.overdue",
    severity: "high",
    title: "Warden.Overdue",
    message: "Describe the trigger condition in one sentence.",
    minTier: 60,
    visibleToRoles: ["warden", "deputy_warden", "hostel_manager"],
    condition: (c) => (c.metrics?.overdue ?? 0) > 0,
    href: "/warden",
    ctaLabel: "Open",
  },
    /* student.curfewexceeded */
  {
    id: "student.curfewexceeded",
    severity: "critical",
    title: "Student.Curfewexceeded",
    message: "Describe the trigger condition in one sentence.",
    minTier: 30,
    visibleToRoles: ["student", "parent"],
    condition: (c) => (c.metrics?.curfewexceeded ?? 0) > 0,
    href: "/student",
    ctaLabel: "Open",
  },
    /* ops.capacitybreach */
  {
    id: "ops.capacitybreach",
    severity: "high",
    title: "Ops.Capacitybreach",
    message: "Describe the trigger condition in one sentence.",
    minTier: 80,
    visibleToRoles: ["admin", "sysadmin"],
    condition: (c) => (c.metrics?.capacitybreach ?? 0) > 0,
    href: "/sysadmin",
    ctaLabel: "Open",
  },
  // SCAFFOLD:ALERTS -- new alerts are injected above this line
];


// Tier map — authoritative source for role tiers
export function getRoleTier(role: string): number {
  const t: Record<string, number> = {
    sysadmin: 100,
    admin: 95,
    principal: 90,
    vice_principal: 85,
    exam_branch: 80,
    oie: 75,
    hostel_manager: 70,
    deputy_warden: 65,
    warden: 60,
    caretaker: 55,
    hod: 50,
  exam_superintendent: 50,
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
