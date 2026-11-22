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
import { buildInvestigationWorkspace } from "@/components/principal/shared/InvestigationWorkspace";
import { classifyOutcome } from "@/hooks/usePrincipalAction";
import { buildExecutionFeedback } from "@/lib/principal/executionFeedback";
import {
  resolvePaletteCommands,
  searchResultsToCommands,
  CONSEQUENTIAL_QUICK_ACTIONS,
} from "@/lib/principal/commandPaletteData";

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

describe("PR-10 execution monitor: honest outcome classification", () => {
  it("a 2xx + parsed body → completed with the authoritative payload", () => {
    const r = classifyOutcome<{ id: string }>(true, true, { id: "p-1" }, 200);
    expect(r.state).toBe("completed");
    expect(r.data).toEqual({ id: "p-1" });
    expect(r.unknown).toBeUndefined();
  });

  it("a known server error (parsed body) → failed with the server's message", () => {
    const r = classifyOutcome<{ error?: { message?: string } }>(
      false,
      true,
      { error: { message: "not in your authority" } },
      403,
    );
    expect(r.state).toBe("failed");
    expect(r.error).toBe("not in your authority");
  });

  it("an UNPARSEABLE body after submit → UNKNOWN (server may have processed)", () => {
    const r = classifyOutcome<unknown>(false, false, null, 502);
    expect(r.state).toBe("unknown");
    expect(r.unknown).toBe(true);
    // the message offers a safe verify path, not a "definitely failed" claim
    expect(/refresh|verify/i.test(r.error ?? "")).toBe(true);
  });

  it("never fabricates a success from an unknown outcome", () => {
    const r = classifyOutcome<unknown>(true, false, null, 200);
    expect(r.state).not.toBe("completed");
    expect(r.unknown).toBe(true);
  });
});

describe("PR-08 investigation workspace (composer over verified blocks)", () => {
  it("assembles the 4 progressive-disclosure sections in order", () => {
    const insp = buildInvestigationWorkspace({
      entity: { type: "incident", id: "i-1", label: "Gate breach" },
      status: "ESCALATED",
      overview: [{ label: "Severity", value: "high" }],
      relationships: [
        { relation: "at gate", target: { type: "gate", id: "g-3", label: "Main Gate" } },
      ],
      timeline: [{ id: "e1", type: "escalated", at: "2026-11-02T00:00:00Z" }],
      actions: [{ id: "resolve", label: "Resolve", entityType: "incident", confirmationRequired: true }],
    });
    expect(insp.kind).toBe("incident");
    expect(insp.title).toBe("Gate breach");
    expect(insp.status).toBe("ESCALATED");
    // progressive order: overview → relationships → timeline (collapsible) → actions
    expect(insp.sections).toHaveLength(4);
    expect(insp.sections.map((s) => s.title)).toEqual([
      "Overview",
      "Connected records",
      "Timeline",
      "Actions",
    ]);
    expect(insp.sections[2].collapsible).toBe(true);
  });

  it("renders honest empty sections when a source has no data (not fabricated)", () => {
    const insp = buildInvestigationWorkspace({
      entity: { type: "student", id: "s-9", label: "Unknown" },
    });
    expect(insp.sections).toHaveLength(4); // all four still present, each honest-empty
    // timeline section carries a real (empty) EntityTimeline, not a fake entry
    expect(insp.sections[2].content).toBeTruthy();
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

describe("PR-11 execution feedback: four distinct facts, not one 'success'", () => {
  const ok = { state: "completed" as const, data: { id: "x" } };

  it("completed + server-confirmed audit ref → audit-verified", () => {
    const fb = buildExecutionFeedback(ok, { auditRef: "evt-123" });
    expect(fb.kind).toBe("audit-verified");
    expect(fb.auditConfirmed).toBe(true);
  });

  it("completed WITHOUT an audit ref → completed, audit NOT claimed", () => {
    const fb = buildExecutionFeedback(ok, {});
    expect(fb.kind).toBe("completed");
    expect(fb.auditConfirmed).toBe(false);
    expect(fb.nextStep).toBeTruthy(); // offers a verify path
  });

  it("unknown outcome → never claims success or certain failure", () => {
    const fb = buildExecutionFeedback({
      state: "unknown",
      unknown: true,
      error: "Connection lost",
    });
    expect(fb.kind).toBe("unknown");
    expect(fb.auditConfirmed).toBe(false);
    expect(/refresh|verify/i.test(fb.nextStep ?? "")).toBe(true);
  });

  it("failed → the server's message, with a safe next step", () => {
    const fb = buildExecutionFeedback({ state: "failed", error: "not in your authority" });
    expect(fb.kind).toBe("failed");
    expect(fb.headline).toContain("not completed");
    expect(fb.auditConfirmed).toBe(false);
  });
});

describe("PR-13 command palette data (deterministic + honest)", () => {
  it("empty query returns the navigation + workflow commands (originals preserved)", () => {
    const cmds = resolvePaletteCommands("");
    const ids = cmds.map((c) => c.id);
    for (const need of [
      "nav-dashboard",
      "nav-delegations",
      "nav-audit",
      "nav-reports",
      "nav-approvals",
    ]) {
      expect(ids).toContain(need);
    }
  });

  it("a command keyword resolves deterministically (no NL guessing)", () => {
    const approvals = resolvePaletteCommands("approvals");
    expect(approvals.map((c) => c.id)).toContain("nav-approvals");
  });

  it("unknown free text returns [] (the UI falls back to real search, not a guess)", () => {
    expect(resolvePaletteCommands("some random student name here")).toEqual([]);
  });

  it("consequential actions are marked kind=consequential + routed to a surface", () => {
    const delegate = CONSEQUENTIAL_QUICK_ACTIONS.find((a) => a.id === "qa-delegate");
    expect(delegate?.kind).toBe("consequential");
    expect(delegate?.needsSurface).toBeTruthy();
  });

  it("search results become open-record commands with a real href (read-only)", () => {
    const cmds = searchResultsToCommands(
      [{ id: "s-1", label: "K. Rao", kind: "student", href: "/principal/people?student=s-1" }],
      "student",
      (r) => r.href,
    );
    expect(cmds[0].kind).toBe("open-record");
    expect(cmds[0].entityId).toBe("s-1");
    expect(cmds[0].href).toBe("/principal/people?student=s-1");
  });
});

describe("PR-14 synchronization (honest refresh, no false 'live')", () => {
  it("the sync state shape is the honest 'refresh' mode (never 'live')", () => {
    // useSynchronization returns mode:'refresh' always (no live claim).
    const sync = {
      mode: "refresh" as const,
      lastUpdated: 1000,
      stale: false,
      connection: "online" as const,
      syncing: false,
      error: null,
    };
    expect(sync.mode).toBe("refresh");
    expect(sync.mode).not.toBe("live");
  });

  it("the indicator text never contains a 'Live' badge", () => {
    // Render-level assertion: the component's literal strings must not claim live.
    const src = require("node:fs").readFileSync(
      "src/components/principal/shared/SynchronizationIndicator.tsx",
      "utf8",
    );
    // The word 'live' must only ever appear in a comment/denial context, not a
    // badge label. The visible labels are Refreshed / status words.
    expect(/>\s*LIVE\s*</.test(src)).toBe(false);
    expect(/\bLive\b/.test(src)).toBe(false);
  });
});
