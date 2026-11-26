import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
vi.mock("@/lib/postgres", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

import { sanitizeAgentPayload } from "@/lib/agent/redactor";
import { resolveAuthorityRoute, isPersonalStudentQuery } from "@/lib/agent/classBridge";
import { matchConfirmedKnowledge, buildPreAnnouncementConfig } from "@/lib/agent/knowledgeMatcher";
import { executeAgentTool } from "@/lib/agent/toolGateway";
import { resolveStudentCapabilities } from "@/lib/agent/contextEnvelope";
import { canInvokeAgentTool } from "../../model-runtime/permission-engine";
import type { AuthContext } from "@/lib/authContext";

function makeAuth(role: AuthContext["role"], overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    userId: "11111111-1111-4111-8111-111111111111",
    role,
    roles: [role],
    status: "active",
    email: `${role}@ucej.ac.in`,
    uniqueId: "22JJ1A0501",
    loginIdentifier: "22JJ1A0501",
    gateId: null,
    departmentId: "CSE",
    employeeId: null,
    passwordMustChange: false,
    handle: null,
    supervisedGates: null,
    ...overrides,
  } as AuthContext;
}

describe("Agent Evals: Redaction Compliance", () => {
  const sample = {
    id: "22222222-2222-4222-8222-222222222222",
    user_id: "33333333-3333-4333-8333-333333333333",
    title: "Mid-1 Exam Schedule",
    password_hash: "hash123",
    hmac_secret: "sec123",
    rls_sql: "SELECT 1",
  };

  it("strips secrets and internal UUIDs for non-sysadmin roles", () => {
    for (const role of ["student", "faculty", "hod", "principal", "admin"]) {
      const out = sanitizeAgentPayload(sample, role) as Record<string, unknown>;
      expect(out.title).toBe("Mid-1 Exam Schedule");
      expect(out.id).toBeUndefined();
      expect(out.user_id).toBeUndefined();
      expect(out.password_hash).toBeUndefined();
      expect(out.hmac_secret).toBeUndefined();
      expect(out.rls_sql).toBeUndefined();
    }
  });

  it("preserves internal IDs for sysadmin while still stripping secrets", () => {
    const out = sanitizeAgentPayload(sample, "sysadmin") as Record<string, unknown>;
    expect(out.id).toBe(sample.id);
    expect(out.user_id).toBe(sample.user_id);
    expect(out.password_hash).toBeUndefined();
    expect(out.hmac_secret).toBeUndefined();
    expect(out.rls_sql).toBeUndefined();
  });
});

describe("Agent Evals: Authority Bridge & Privacy Guard", () => {
  it("routes topics to the expected authority chain", () => {
    expect(resolveAuthorityRoute("academic")).toEqual({
      topic: "academic",
      target_role: "faculty",
      escalation_chain: ["faculty", "hod"],
    });
    expect(resolveAuthorityRoute("exam")).toEqual({
      topic: "exam",
      target_role: "exam_branch",
      escalation_chain: ["exam_branch", "oie"],
    });
    expect(resolveAuthorityRoute("curfew")).toEqual({
      topic: "curfew",
      target_role: "deputy_warden",
      escalation_chain: ["deputy_warden", "hostel_manager"],
    });
    expect(resolveAuthorityRoute("policy")).toEqual({
      topic: "policy",
      target_role: "admin",
      escalation_chain: ["admin", "vice_principal", "principal"],
    });
  });

  it("detects personal student queries without false-positives on class queries", () => {
    expect(isPersonalStudentQuery("What is my attendance percentage?")).toBe(true);
    expect(isPersonalStudentQuery("Is my gate pass approved?")).toBe(true);
    expect(isPersonalStudentQuery("When is the CS301 lab exam?")).toBe(false);
    expect(isPersonalStudentQuery("Which circulars are unnoted?")).toBe(false);
  });
});

describe("Agent Evals: Constraint-Scoped Knowledge & Pre-Announcement", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("returns exact match when class_id or also_applies_to matches", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          question_pattern: "lab record submission deadline",
          answer_text: "Submit lab records by Friday 4 PM.",
          topic: "academic",
          class_id: "CSE-3A",
          subject_code: "CS301",
          department_id: "CSE",
          persona: "all",
          condition_note: null,
          also_applies_to: ["CSE-3B"],
          confirmed_by_role: "faculty",
          source_kind: "faculty_confirmation",
          source_ref: null,
        },
      ],
    });

    const res = await matchConfirmedKnowledge(
      "When is the lab record submission deadline?",
      { classId: "CSE-3B", subjectCode: "CS301", departmentId: "CSE" },
      "student",
    );
    expect(res.matchType).toBe("exact");
    expect(res.entry?.answer_text).toContain("Friday 4 PM");
    expect((res.entry as unknown as Record<string, unknown>)?.id).toBeUndefined();
  });

  it("flags partial mismatch when class_id or persona differs", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          question_pattern: "curfew timing extension",
          answer_text: "Curfew extended to 9 PM for hostellers.",
          topic: "curfew",
          class_id: "IT-3A",
          subject_code: null,
          department_id: "IT",
          persona: "hosteller",
          condition_note: null,
          also_applies_to: [],
          confirmed_by_role: "deputy_warden",
          source_kind: "faculty_confirmation",
          source_ref: null,
        },
      ],
    });

    const res = await matchConfirmedKnowledge(
      "Is curfew timing extension active?",
      { classId: "CSE-3A", departmentId: "CSE", persona: "day_scholar" },
      "student",
    );
    expect(res.matchType).toBe("partial");
    expect(res.mismatchReason).toContain("class IT-3A");
    expect(res.mismatchReason).toContain("persona hosteller");
  });

  it("sets requires_senior_approval based on sender role", () => {
    const facultyCfg = buildPreAnnouncementConfig(makeAuth("faculty"), {
      target_group_slug: "cse-3a",
      summary: "Lab rescheduled",
    });
    expect(facultyCfg.requires_senior_approval).toBe(true);

    const hodCfg = buildPreAnnouncementConfig(makeAuth("hod"), {
      target_group_slug: "cse-3a",
      summary: "Department circular",
    });
    expect(hodCfg.requires_senior_approval).toBe(false);
  });
});

describe("Agent Evals: Tool Gateway & Student Capability Tiers", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("denies draft_action for students and allows it for faculty with confirmation", async () => {
    expect(canInvokeAgentTool("student", "draft_action")).toBe(false);
    expect(canInvokeAgentTool("faculty", "draft_action")).toBe(true);

    const studentRes = await executeAgentTool(makeAuth("student"), "draft_action", {
      action_type: "circular_remind",
      target_ref: "CIR-101",
    });
    expect(studentRes.ok).toBe(false);

    const facultyRes = await executeAgentTool(makeAuth("faculty"), "draft_action", {
      action_type: "circular_remind",
      target_ref: "CIR-101",
    });
    expect(facultyRes.ok).toBe(true);
    expect(facultyRes.draft?.requires_confirmation).toBe(true);
  });

  it("gates detained students and grants route capability only to active class reps", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ residence_type: "hosteller", academic_status: "detained" }],
    });
    const detainedCaps = await resolveStudentCapabilities(makeAuth("student"), "moderator");
    expect(detainedCaps?.can_request_pass).toBe(false);
    expect(detainedCaps?.can_submit_doubt).toBe(false);
    expect(detainedCaps?.can_route_doubt).toBe(false);
    expect(detainedCaps?.can_view_hostel_curfew).toBe(true);

    mockQuery.mockResolvedValueOnce({
      rows: [{ residence_type: "day_scholar", academic_status: "active" }],
    });
    const repCaps = await resolveStudentCapabilities(makeAuth("student"), "moderator");
    expect(repCaps?.can_request_pass).toBe(true);
    expect(repCaps?.can_submit_doubt).toBe(true);
    expect(repCaps?.can_route_doubt).toBe(true);
    expect(repCaps?.can_view_hostel_curfew).toBe(false);
  });
});
