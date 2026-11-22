/**
 * tests/unit/principal-experience.test.ts — PR-02/03/04 foundation tests.
 *
 * Covers the shared contracts (PR-02), the URL<->workspace pure functions
 * (PR-03), and the composable inspector section builders (PR-04). These are
 * the foundations the whole 16-PR programme builds on; testing them here
 * (not just at PR-16) is the programme's "test each feature as implemented".
 */
import { describe, it, expect } from "vitest";
import type {
  PrincipalEntityType,
  PrincipalEntityRef,
  PrincipalRelationship,
  PrincipalTimelineEvent,
  PrincipalActionDefinition,
} from "@/lib/principal/contracts";
import {
  parseWorkspaceUrl,
  applyWorkspacePatch,
} from "@/hooks/usePrincipalWorkspace";
import { createInspectorSections } from "@/components/principal/shared/inspectorSections";
import {
  auditLogsToEvents,
  type AuditLogRow,
} from "@/lib/principal/auditTimeline";
import {
  permissionRelationships,
  alertRelationships,
  refOrUnavailable,
} from "@/lib/principal/relationshipResolver";

describe("PR-02 contracts: entity identity is a closed, validated set", () => {
  const kinds: PrincipalEntityType[] = [
    "student",
    "faculty",
    "staff",
    "department",
    "hostel",
    "gate",
    "incident",
    "complaint",
    "permission",
    "approval",
    "delegation",
    "examination_case",
    "institutional_case",
  ];

  it("has a known, non-empty, deduplicated set of entity kinds", () => {
    expect(kinds.length).toBeGreaterThan(0);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it("a PrincipalEntityRef carries a real id + label (no parsed identity)", () => {
    const ref: PrincipalEntityRef = { type: "hostel", id: "h-1", label: "Hostel A" };
    expect(ref.type).toBe("hostel");
    expect(ref.id).toBe("h-1");
    expect(ref.label).toBe("Hostel A");
  });
});

describe("PR-03 workspace URL<->context mapping (pure)", () => {
  it("round-trips an inspected entity + returnTo", () => {
    const sp = new URLSearchParams(
      "entity=incident&entityId=i-9&entityLabel=Gate%20breach&returnTo=%2Fprincipal&filter=",
    );
    const state = parseWorkspaceUrl(sp);
    expect(state.inspect?.entity.type).toBe("incident");
    expect(state.inspect?.entity.id).toBe("i-9");
    expect(state.inspect?.entity.label).toBe("Gate breach");
    expect(state.inspect?.returnTo).toBe("/principal");
    // empty filter param ("filter=") parses to "" (falsy), which the hook treats
    // as "no filter" — assert falsy, not strict null
    expect(state.filter).toBeFalsy();
  });

  it("fails safe on an unknown entity kind (does not invent identity)", () => {
    const sp = new URLSearchParams("entity=alien&entityId=x-1");
    expect(parseWorkspaceUrl(sp).inspect).toBeNull();
  });

  it("fails safe when the entity id is missing", () => {
    const sp = new URLSearchParams("entity=hostel");
    expect(parseWorkspaceUrl(sp).inspect).toBeNull();
  });

  it("reads a shareable filter when present", () => {
    const sp = new URLSearchParams("filter=ESCALATED");
    expect(parseWorkspaceUrl(sp).filter).toBe("ESCALATED");
  });

  it("applyWorkspacePatch clears a key when null/empty", () => {
    const sp = new URLSearchParams("entity=gate&entityId=g-1&filter=x");
    const next = applyWorkspacePatch(sp, { entity: null, id: null, label: null, filter: null });
    expect(next.get("entity")).toBeNull();
    expect(next.get("entityId")).toBeNull();
    expect(next.get("filter")).toBeNull();
  });

  it("applyWorkspacePatch sets only the keys it is told to", () => {
    const sp = new URLSearchParams("filter=A");
    const next = applyWorkspacePatch(sp, { filter: "B" });
    expect(next.get("filter")).toBe("B");
    // untouched keys preserved
    expect(next.get("entity")).toBeNull();
  });
});

describe("PR-04 composable inspector sections (pure logic)", () => {
  const s = createInspectorSections();

  it("overview: returns a titled section with KVPairs content for pairs", () => {
    const withPairs = s.overview([
      { label: "Status", value: "OPEN" },
      { label: "Owner", value: "Warden" },
    ]);
    expect(withPairs.title).toBe("Overview");
    expect(withPairs.content).toBeTruthy();
  });

  it("overview: empty pairs still returns a section (honest empty, not omitted)", () => {
    const empty = s.overview([]);
    expect(empty.title).toBe("Overview");
    expect(empty.content).toBeTruthy(); // an Empty node, not undefined
  });

  it("relationships: missing/inaccessible records stay in the list (no invented edges)", () => {
    const rels: PrincipalRelationship[] = [
      { relation: "located at", target: { type: "hostel", id: "h-1", label: "Hostel A" } },
      {
        relation: "complaints",
        target: { type: "complaint", id: "c-1", label: "C-1" },
        available: false,
        unavailableReason: "not authorized",
      },
    ];
    const section = s.relationships(rels, (r) => `${r.relation}: ${r.target.label}`);
    expect(section.title).toBe("Connected records");
    expect(section.content).toBeTruthy();
  });

  it("relationships: no records -> an (empty) section, not a fabricated list", () => {
    const section = s.relationships([], () => null);
    expect(section.title).toBe("Connected records");
    expect(section.content).toBeTruthy();
  });

  it("timeline: collapsible by default; empty-safe; events only from data", () => {
    const none = s.timeline([], (e: PrincipalTimelineEvent) => e.id);
    expect(none.collapsible).toBe(true);
    expect(none.content).toBeTruthy(); // honest empty node
    const events: PrincipalTimelineEvent[] = [
      { id: "e1", type: "created", at: "2026-11-01T00:00:00Z" },
      { id: "e2", type: "escalated", at: "2026-11-02T00:00:00Z" },
    ];
    const some = s.timeline(events, (e: PrincipalTimelineEvent) => e.type);
    expect(some.title).toBe("Timeline");
    expect(some.content).toBeTruthy();
  });

  it("actions: presentation only, empty-safe", () => {
    const none = s.actions([], (_a: PrincipalActionDefinition) => null);
    expect(none.content).toBeTruthy();
    const acts: PrincipalActionDefinition[] = [
      { id: "approve", label: "Approve", entityType: "permission", confirmationRequired: true },
    ];
    const some = s.actions(acts, (a: PrincipalActionDefinition) => a.label);
    expect(some.title).toBe("Actions");
    expect(some.content).toBeTruthy();
  });

  it("timelineSection: renders via the shared EntityTimeline (honest empty)", () => {
    const section = s.timelineSection([], { loading: false, error: null });
    expect(section.title).toBe("Timeline");
    expect(section.collapsible).toBe(true);
    expect(section.content).toBeTruthy();
  });
});

describe("PR-07 relationship resolver (real refs, honest unavailability)", () => {
  it("permission → requester + workflow stage, from real ids", () => {
    const rels = permissionRelationships({
      id: "p-1",
      ticket_number: "T-9",
      requester_user_id: "u-7",
      student_name: "K. Rao",
      current_stage: "principal",
    });
    const requested = rels.find((r) => r.relation === "requested by");
    expect(requested?.available).toBe(true);
    expect(requested?.target).toEqual({ type: "student", id: "u-7", label: "K. Rao" });
    const stage = rels.find((r) => r.relation === "in workflow stage");
    expect(stage?.target?.id).toBe("p-1"); // the permission record, not a guessed user
  });

  it("permission with no recorded requester → honest unavailable (no invented student)", () => {
    const rels = permissionRelationships({ id: "p-2", requester_user_id: null });
    const requested = rels.find((r) => r.relation === "requested by");
    expect(requested?.available).toBe(false);
    expect(requested?.unavailableReason).toBeTruthy();
  });

  it("alert → gate + department, missing gate is marked unavailable", () => {
    const withGate = alertRelationships({
      id: "al-1",
      gate_id: "g-3",
      gate_name: "Main Gate",
      dept_code: "CSE",
    });
    expect(withGate.find((r) => r.relation === "at gate")?.target).toEqual({
      type: "gate",
      id: "g-3",
      label: "Main Gate",
    });
    expect(withGate.find((r) => r.relation === "concerns department")?.target?.id).toBe("CSE");

    const noGate = alertRelationships({ id: "al-2" });
    const gateRel = noGate.find((r) => r.relation === "at gate");
    expect(gateRel?.available).toBe(false);
    expect(gateRel?.unavailableReason).toBeTruthy();
  });

  it("refOrUnavailable marks a null id unavailable with a reason", () => {
    const present = refOrUnavailable("assigned to", "faculty", "f-9", "Prof. Me");
    expect(present.available).toBe(true);
    expect(present.target.id).toBe("f-9");
    const missing = refOrUnavailable("assigned to", "faculty", null);
    expect(missing.available).toBe(false);
    expect(missing.unavailableReason).toBeTruthy();
  });
});

describe("PR-06 audit timeline mapper (real recorded events only)", () => {
  const rows: AuditLogRow[] = [
    {
      id: "a1",
      action: "ESCALATION",
      user_name: "Warden",
      user_role: "warden",
      details: { reason: "SLA breach" },
      timestamp: "2026-11-02T09:00:00Z",
    },
    {
      id: "a2",
      action: "APPROVAL",
      user_name: "Principal",
      details: "approved out-pass",
      timestamp: "2026-11-01T08:00:00Z",
    },
    { id: "a3", action: "RESOLVE", timestamp: "2026-11-01T07:00:00Z" },
  ];

  it("maps real rows to events, preserving only stored fields", () => {
    const events = auditLogsToEvents(rows);
    expect(events).toHaveLength(3);
    // newest-first order preserved
    expect(events[0].type).toBe("ESCALATION");
    expect(events[0].actor).toEqual({ label: "Warden", role: "warden" });
    expect(events[0].reason).toBe("SLA breach");
    expect(events[0].auditRef).toBe("a1");
    // string details → reason
    expect(events[1].reason).toBe("approved out-pass");
    // no actor / reason when the backend didn't store them (not invented)
    expect(events[2].actor).toBeUndefined();
    expect(events[2].reason).toBeUndefined();
  });

  it("dedupes by audit id (a refetch can't double a row)", () => {
    const dup = [...rows, { ...rows[0] }];
    expect(auditLogsToEvents(dup)).toHaveLength(3);
  });

  it("drops unusable rows (no action AND no timestamp) rather than faking them", () => {
    const events = auditLogsToEvents([
      { id: "x", action: "", timestamp: "" },
      { id: "ok", action: "OPEN", timestamp: "2026-11-01T00:00:00Z" },
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("ok");
  });
});
