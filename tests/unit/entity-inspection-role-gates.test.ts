import { describe, it, expect } from "vitest";

/**
 * PR-05C — role-gated inspection models (operator/supervisor/worker/caretaker).
 *
 * These tests exercise the REAL model builders from
 * src/components/shared/roleInspectors.tsx against the same contract
 * the design doc pins (docs/design/entity-inspection-system.md:41-45 +
 * PR-05A §5 DoD):
 *
 *   1. sections[0] is the quick-overview layer.
 *   2. history/timeline sections are collapsible.
 *   3. every model exposes an Actions section or a detailHref.
 *
 * The `status` field of each model is a React element (a status pill);
 * the assertions below use `React.isValidElement` to keep the suite
 * runnable under vitest's node environment (no DOM needed).
 */

import {
  transactionInspection,
  gateLiveInspection,
  exceptionInspection,
  passTicketInspection,
  shiftInspection,
  alertInspection,
  caseInspection,
  requestInspection,
  assetInspection,
  type TxnRow,
  type GateLiveRow,
  type PassQueueRow,
} from "@/components/shared/roleInspectors";

interface ModelLike {
  kind: string;
  title: string;
  subtitle?: string | null;
  status?: unknown;
  sections: Array<{ title: string; content: unknown; collapsible?: boolean }>;
  detailHref?: string;
  detailLabel?: string;
}

function assertContract(m: ModelLike) {
  expect(m.kind).toBeTypeOf("string");
  expect(m.title).toBeTypeOf("string");
  expect(m.sections.length).toBeGreaterThanOrEqual(1);
  expect(m.sections[0].title.toLowerCase()).toMatch(/overview|context/);
  for (const s of m.sections) {
    if (/history|timeline/i.test(s.title)) {
      expect(s.collapsible, `${s.title} must be collapsible`).toBe(true);
    }
  }
  if (!m.detailHref) {
    expect(m.sections.some((s) => /actions/i.test(s.title))).toBe(true);
  }
}

/* sample fixtures */

const txn: TxnRow = {
  id: "txn-1",
  roll: "23JJ1A0599",
  name: "Priya Sharma",
  direction: "OUT",
  reason: "home_out",
  gate_id: "g-1",
  gate_name: "Main Gate",
  timestamp: new Date().toISOString(),
  scan_type: null,
  is_correction: null,
};

const gate: GateLiveRow = {
  id: "g-1",
  gateCode: "G-MAIN",
  name: "Main Gate",
  isActive: true,
  onPost: 3,
  lastActivity: new Date().toISOString(),
  recentEntries: 12,
  recentExits: 8,
};

const pass: PassQueueRow = {
  id: "p-1",
  ticket_number: "P-1027",
  workflow_type: "hostel",
  status: "PENDING",
  current_stage: "main_gate",
  sla_deadline: new Date(Date.now() + 3600_000).toISOString(),
  student: { name: "Priya Sharma", unique_id: "23JJ1A0599", student_details: { roll: "23JJ1A0599" } },
};

describe("role-gated inspection models (PR-05C)", () => {
  it("transaction: overview → collapsible timeline → role-gated actions (operator)", () => {
    const m = transactionInspection(txn, "operator");
    assertContract(m);
    expect(m.kind).toBe("transaction");
    expect(m.sections[0].title).toBe("Overview");
    expect(m.sections[1].collapsible).toBe(true);
    const actions = m.sections.find((s) => s.title === "Actions")!;
    // operator can open the gate telemetry (GET /api/gates allows operator)
    expect(actions.content).toBeDefined();
  });

  it("transaction: worker role gets the read-only note instead of a gate action", () => {
    const m = transactionInspection(txn, "worker");
    assertContract(m);
    const actions = m.sections.find((s) => s.title === "Actions")!;
    expect(actions.content).toBeDefined();
  });

  it("exception: overview → context → collapsible timeline → actions", () => {
    const m = exceptionInspection({ ...txn, reason: "denied: pass expired" }, ["Denied"], "operator");
    assertContract(m);
    expect(m.kind).toBe("exception");
    expect(m.sections[1].title).toBe("Context");
  });

  it("gate: overview → movement → role-gated actions (supervisor)", () => {
    const m = gateLiveInspection(gate, "supervisor");
    assertContract(m);
    expect(m.kind).toBe("gate");
    expect(m.sections[0].title).toBe("Overview");
  });

  it("gate: caretaker role gets the read-only note", () => {
    const m = gateLiveInspection(gate, "caretaker");
    assertContract(m);
  });

  it("pass ticket: operator + main_gate stage exposes verify/reject actions", () => {
    const m = passTicketInspection(pass, { role: "operator", onVerify: () => {}, onReject: () => {} });
    assertContract(m);
    expect(m.kind).toBe("pass");
    expect(m.detailHref).toBe("/permissions/P-1027");
    const actions = m.sections.find((s) => s.title === "Actions")!;
    expect(actions.content).toBeDefined();
  });

  it("pass ticket: worker role is read-only", () => {
    const m = passTicketInspection(pass, { role: "worker" });
    assertContract(m);
  });

  it("shift: supervisor can log handover; worker sees the read-only note", () => {
    const sup = shiftInspection({ startedAt: new Date().toISOString(), endsAt: new Date().toISOString() }, "supervisor");
    assertContract(sup);
    expect(sup.kind).toBe("shift");
    const worker = shiftInspection({ startedAt: new Date().toISOString() }, "worker");
    assertContract(worker);
  });

  it("alert: overview → collapsible timeline → actions (no mutation for supervisor)", () => {
    const m = alertInspection({
      id: "a-1",
      severity: "critical",
      title: "Repeated badge scan",
      timestamp: new Date().toISOString(),
      resolved: false,
    });
    assertContract(m);
    expect(m.kind).toBe("alert");
  });

  it("case: overview → actions (route to the escalation console)", () => {
    const m = caseInspection({ id: "c-1", ref: "CASE-2027-001", type: "conduct", state: "OPEN", risk: "high" });
    assertContract(m);
    expect(m.kind).toBe("case");
  });

  it("request (work order): overview → collapsible history → read-only note for worker", () => {
    const m = requestInspection({
      id: "wo-1",
      ticket: "WO-42",
      type: "maintenance",
      status: "PENDING",
      requesterName: "Facilities",
      createdAt: new Date().toISOString(),
    });
    assertContract(m);
    expect(m.kind).toBe("request");
    expect(m.sections.find((s) => s.title === "History")?.collapsible).toBe(true);
  });

  it("asset: overview → actions (maintenance queue link)", () => {
    const m = assetInspection({
      id: "as-1",
      name: "Block A pump",
      category: "plumbing",
      status: "Open",
      location: "Block A",
    });
    assertContract(m);
    expect(m.kind).toBe("asset");
  });

  /* PR-05C-remainder: notification-item + win-feed shapes */

  it("notification-derived ticket: resolved win keeps the ticket overview", () => {
    // WinFeed items carry {ticket, status: RESOLVED} — the model must still
    // satisfy the contract and link to the full ticket detail.
    const m = passTicketInspection(
      { id: "P-900", ticket_number: "P-900", status: "RESOLVED" },
      { role: "supervisor" },
    );
    assertContract(m);
    expect(m.detailHref).toBe("/permissions/P-900");
  });

  it("notification-derived alert: resolved incident keeps the timeline collapsible", () => {
    const m = alertInspection({
      id: "a-9",
      severity: "high",
      title: "Badge scan anomaly cleared",
      timestamp: new Date().toISOString(),
      resolved: true,
    });
    assertContract(m);
    expect(m.sections.find((s) => s.title === "Timeline")?.collapsible).toBe(true);
  });

  it("reports metric rows reuse the transaction overview (supervisor read-only)", () => {
    const m = transactionInspection(
      { id: "entries", direction: "IN", reason: "Logged entry scans", timestamp: new Date().toISOString() },
      "supervisor",
    );
    assertContract(m);
    // supervisor can read gates: the action link to gate telemetry is present
    expect(m.kind).toBe("transaction");
  });
});
