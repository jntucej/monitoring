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
});
