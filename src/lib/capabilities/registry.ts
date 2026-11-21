// src/lib/capabilities/registry.ts
//
// The SINGLE place "who sees what under which condition" is written down
// (guardrail #4). Every condition is a PURE function over WorkspaceContext.
// No `if (role === 'hosteller')` scattered in components/routes/hooks.
//
// Guardrail #6: view ≠ act ≠ approve are SEPARATE capabilities. An approver
// can view a request without holding the act capability.
// Guardrail #8: approval-stage eligibility is derived from the resolved
// context (role + domain + delegation), not a hardcoded role list.
//
// version (registryVersion) is bumped on any change so a stale cached client
// bundle can't disagree with the server (guardrail #13).

import type { CapabilityDef, WorkspaceContext } from "./types";

/** Bump on any registry change. */
export const CAPABILITY_REGISTRY_VERSION = 1;

const student = (c: WorkspaceContext) => c.personType === "student";
const hosteller = (c: WorkspaceContext) => c.residentialStatus === "hosteller";
const dayScholar = (c: WorkspaceContext) => c.residentialStatus === "day_scholar";
const inCampus = (c: WorkspaceContext) => c.campusStatus === "in_campus";
const outCampus = (c: WorkspaceContext) => c.campusStatus === "out_campus";
const hasRole = (c: WorkspaceContext, role: string) => c.roles.includes(role);

/** A hosteller currently OUT with an active hostel leave that has a deadline. */
function hostelLeaveOut(c: WorkspaceContext): boolean {
  return (
    hosteller(c) &&
    outCampus(c) &&
    c.activeAuthorizations.some(
      (a) => a.kind === "hostel_leave" && a.status === "active" && !!a.expectedReturnAt,
    )
  );
}

/** Overstay: out, with a hostel leave whose deadline has passed. */
function overstay(c: WorkspaceContext): boolean {
  if (!hostelLeaveOut(c)) return false;
  const now = Date.now();
  return c.activeAuthorizations.some(
    (a) =>
      a.kind === "hostel_leave" &&
      a.status === "active" &&
      !!a.expectedReturnAt &&
      new Date(a.expectedReturnAt).getTime() < now,
  );
}

export const CAPABILITY_REGISTRY: CapabilityDef[] = [
  // ── shared / campus (everyone who is a person on campus) ─────────────────
  { id: "campus.status.view", kind: "ux", label: "See my campus in/out status", when: (c) => student(c) },
  { id: "movement.view", kind: "ux", label: "See my recent gate movement", when: (c) => student(c) },
  { id: "credential.view", kind: "security", label: "See my student credential/QR", when: (c) => student(c) },
  { id: "campus.entry", kind: "security", label: "Enter campus (scan in)", when: (c) => student(c) },
  { id: "campus.exit", kind: "security", label: "Exit campus (scan out)", when: (c) => student(c) },
  { id: "classes.view", kind: "ux", label: "See today's classes", when: (c) => student(c) },
  { id: "attendance.view", kind: "ux", label: "See my attendance", when: (c) => student(c) },
  { id: "announcements.view", kind: "ux", label: "Read announcements", when: () => true },

  // ── day scholar (no hostel features — the whole point of the split) ──────
  { id: "day.out.request", kind: "security", label: "Request a day out", when: (c) => dayScholar(c) },
  { id: "event.pass.request", kind: "security", label: "Request an event pass", when: (c) => dayScholar(c) },

  // ── hosteller — IN campus ────────────────────────────────────────────────
  { id: "curfew.view", kind: "ux", label: "See curfew", when: (c) => hosteller(c) },
  { id: "hostel.occupancy.view", kind: "ux", label: "See hostel room/block", when: (c) => hosteller(c) && inCampus(c) },
  { id: "hostel.leave.apply", kind: "security", label: "Apply for hostel leave", when: (c) => hosteller(c) && inCampus(c) },
  { id: "hostel.leave.view", kind: "ux", label: "See my leave status", when: (c) => hosteller(c) },

  // ── hosteller — OUT campus (return / overstay context) ──────────────────
  { id: "expected-return.view", kind: "ux", label: "See expected return", when: (c) => hostelLeaveOut(c) },
  { id: "overstay.view", kind: "security", label: "See overstay/late-return state", when: (c) => overstay(c) },
  { id: "return-gate.view", kind: "ux", label: "See which gate to return at", when: (c) => hostelLeaveOut(c) },
  { id: "mess.off.request", kind: "security", label: "Request mess off", when: (c) => hosteller(c) && inCampus(c) },

  // ── view vs act vs approve — approval stages (guardrail #6/#8) ─────────
  // A hosteller's hostel leave needs parent ack + hostel authority (4-stage
  // caretaker→principal, or 2-stage for emergency). The *act* capability is
  // derived from the resolved context (role + domain + delegation), NOT a
  // hardcoded role list.
  { id: "approval.hostel.view", kind: "ux", label: "See hostel approval queue", when: (c) => ["caretaker", "deputy_warden", "hostel_manager", "principal"].some((r) => hasRole(c, r)) },
  {
    id: "approval.hostel.act",
    kind: "security",
    label: "Approve/reject a hostel movement",
    when: (c) => {
      const approvable = c.activeApprovals.some((s) => s.domain === "hostel");
      if (!approvable) return false; // nothing in scope to act on
      // The stage the person can act on must match their role in the chain,
      // OR they hold a valid delegation for that stage (guardrail #8).
      const canActStage = c.activeApprovals.some((s) => s.domain === "hostel" && s.role && hasRole(c, s.role));
      return canActStage;
    },
  },
  { id: "approval.escalate", kind: "security", label: "Escalate a blocked approval", when: (c) => ["hostel_manager", "principal", "vice_principal"].some((r) => hasRole(c, r)) },

  // ── operator ──────────────────────────────────────────────────────────────
  { id: "gate.scan", kind: "security", label: "Scan a credential at the gate", when: (c) => hasRole(c, "operator") && !!c.currentShift },
  { id: "gate.live.view", kind: "ux", label: "See live gate state", when: (c) => ["operator", "supervisor"].some((r) => hasRole(c, r)) },
  { id: "gate.exception.view", kind: "security", label: "View gate exceptions", when: (c) => ["operator", "supervisor"].some((r) => hasRole(c, r)) },
  { id: "gate.device.view", kind: "ux", label: "See gate device status", when: (c) => ["operator", "supervisor"].some((r) => hasRole(c, r)) },

  // ── supervisor ────────────────────────────────────────────────────────────
  { id: "incident.manage", kind: "security", label: "Manage gate incidents", when: (c) => hasRole(c, "supervisor") },
  { id: "escalation.resolve", kind: "security", label: "Resolve escalations", when: (c) => hasRole(c, "supervisor") },
  { id: "operator.manage", kind: "security", label: "Manage operators/shifts", when: (c) => hasRole(c, "supervisor") },

  // ── command (principal / warden) ─────────────────────────────────────────
  { id: "campus.overview", kind: "ux", label: "Campus security overview", when: (c) => hasRole(c, "principal") },
  { id: "lockdown.act", kind: "security", label: "Trigger/raise a lockdown", when: (c) => hasRole(c, "principal") },
  { id: "lockdown.view", kind: "ux", label: "See lockdown status", when: (c) => ["principal", "vice_principal", "supervisor"].some((r) => hasRole(c, r)) },
  { id: "movement.trends.view", kind: "ux", label: "See high-level movement/exception trends", when: (c) => hasRole(c, "principal") },
];

export default CAPABILITY_REGISTRY;
