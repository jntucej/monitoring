/**
 * tests/gate/service/security-sos.test.ts — Hard guards for Campus Security & SOS:
 *   1. No active shift → 403 'no_active_shift'
 *   2. Gate A operator posting Gate B → 403 'wrong_gate'
 *   3. Patrol operator posting gate_scan → 403 'post_not_gate'
 *   4. Patrol operator accepting SOS → 200 if assigned, 403 if not assigned
 *   5. Two guards accept same SOS → one 200, one 409 'already_taken'
 *   6. No guard on shift → escalates to supervisor
 *   7. Critical SOS → dispatches AND escalates in parallel
 *   8. Strict transition order: on_scene before en_route → 409
 *   9. Every transition writes sos_events + publishNotification
 */
import { NextRequest, NextResponse } from "next/server";

const mockQuery = jest.fn();
const mockPublish = jest.fn(async () => ({ sent: 1 }));
const mockAudit = jest.fn(async () => {});

jest.mock("@/lib/postgres", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

jest.mock("@/lib/notifications/bus", () => ({
  publishNotification: (...args: unknown[]) => mockPublish(...args),
}));

jest.mock("@/lib/db", () => ({
  addAudit: (...args: unknown[]) => mockAudit(...args),
}));

import { withActiveShift } from "@/middleware/activeShift";
import {
  acceptDispatch,
  dispatchSos,
  transitionDispatch,
} from "@/lib/security/dispatch";

const OP1 = "11111111-1111-4111-8111-111111111111";
const OP2 = "22222222-2222-4222-8222-222222222222";
const GATE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const GATE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SOS_ID = "33333333-3333-4333-8333-333333333333";
const DID_1 = "44444444-4444-4444-8444-444444444444";
const DID_2 = "55555555-5555-4555-8555-555555555555";

function makeReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/gate/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Campus Security & SOS hard guards", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockPublish.mockClear();
    mockAudit.mockClear();
  });

  it("1. Operator with no active shift → 403 no_active_shift", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const wrapped = withActiveShift(
      async () => NextResponse.json({ ok: true }),
      { need: "gate_scan", gateFrom: "body" },
    );
    const res = await wrapped(makeReq({ gate_id: GATE_A }), {
      auth: { userId: OP1, role: "operator" } as never,
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "no_active_shift" });
  });

  it("2. Operator at Gate A posting Gate B → 403 wrong_gate", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ shift_id: "sh-1", assignment_id: "a-1", post_id: "p-1", kind: "gate", gate_id: GATE_A }],
    });
    const wrapped = withActiveShift(
      async () => NextResponse.json({ ok: true }),
      { need: "gate_scan", gateFrom: "body" },
    );
    const res = await wrapped(makeReq({ gate_id: GATE_B }), {
      auth: { userId: OP1, role: "operator" } as never,
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "wrong_gate" });
  });

  it("3. Operator on patrol post posting gate_scan → 403 post_not_gate", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ shift_id: "sh-1", assignment_id: "a-1", post_id: "p-2", kind: "patrol", gate_id: null }],
    });
    const wrapped = withActiveShift(
      async () => NextResponse.json({ ok: true }),
      { need: "gate_scan", gateFrom: "body" },
    );
    const res = await wrapped(makeReq({ gate_id: GATE_A }), {
      auth: { userId: OP1, role: "operator" } as never,
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "post_not_gate" });
  });

  it("4 & 5. acceptDispatch: 403 if not assigned; two guards → one ok, one 409 already_taken", async () => {
    // Not assigned
    mockQuery.mockResolvedValueOnce({ rows: [{ operator_id: OP1, status: "offered" }] });
    const wrongOp = await acceptDispatch(SOS_ID, DID_1, OP2);
    expect(wrongOp).toEqual({ ok: false, status: 403, error: "not_assigned_operator" });

    // Guard 1 wins, Guard 2 loses race
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT operator_id, status FROM public.sos_dispatch")) {
        return { rows: [{ operator_id: OP1, status: "offered" }] };
      }
      if (sql.includes("UPDATE public.sos_dispatch") && sql.includes("SET status = 'accepted'")) {
        return { rows: [{ id: DID_1 }] };
      }
      if (sql.includes("UPDATE public.sos_requests SET status = 'dispatched'")) {
        return { rows: [{ student_id: "stu-1" }] };
      }
      return { rows: [] };
    });
    const win = await acceptDispatch(SOS_ID, DID_1, OP1);
    expect(win).toEqual({ ok: true });

    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT operator_id, status FROM public.sos_dispatch")) {
        return { rows: [{ operator_id: OP2, status: "offered" }] };
      }
      if (sql.includes("UPDATE public.sos_dispatch") && sql.includes("SET status = 'accepted'")) {
        return { rows: [] }; // lost atomic lease
      }
      return { rows: [] };
    });
    const lose = await acceptDispatch(SOS_ID, DID_2, OP2);
    expect(lose).toEqual({ ok: false, status: 409, error: "already_taken" });
  });

  it("6. No guard on shift → escalates to supervisor", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await dispatchSos({
      id: SOS_ID,
      student_id: "stu-1",
      category: "medical",
      priority: "urgent",
      status: "open",
      student_lat: 17.9784,
      student_lng: 79.5942,
      nearest_loc_id: null,
      chosen_loc_id: null,
    });
    expect(res).toEqual({ offered: 0, escalated: true });
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "sos.escalated.supervisor", priority: "high" }),
    );
  });

  it("7. Critical SOS dispatches AND escalates in parallel", async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("WITH sos AS")) {
        return { rows: [{ assignment_id: "a-1", operator_id: OP1, post_id: "p-1", post_kind: "patrol", distance_m: 50 }] };
      }
      return { rows: [] };
    });
    const res = await dispatchSos({
      id: SOS_ID,
      student_id: "stu-1",
      category: "medical",
      priority: "critical",
      status: "open",
      student_lat: 17.9784,
      student_lng: 79.5942,
      nearest_loc_id: null,
      chosen_loc_id: null,
    });
    expect(res).toEqual({ offered: 1, escalated: true });
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "sos.escalated.supervisor" }),
    );
  });

  it("8 & 9. Strict transition order (on_scene before en_route → 409) + writes sos_events & notification", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ operator_id: OP1, status: "accepted" }] });
    const bad = await transitionDispatch(SOS_ID, DID_1, OP1, "on_scene");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.status).toBe(409);

    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT operator_id, status FROM public.sos_dispatch")) {
        return { rows: [{ operator_id: OP1, status: "accepted" }] };
      }
      if (sql.includes("UPDATE public.sos_requests")) {
        return { rows: [{ student_id: "stu-1" }] };
      }
      return { rows: [] };
    });
    const good = await transitionDispatch(SOS_ID, DID_1, OP1, "en_route");
    expect(good).toEqual({ ok: true });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO public.sos_events"),
      expect.arrayContaining([SOS_ID, OP1, "operator", "en_route"]),
    );
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "sos.en_route", scope: "user:stu-1" }),
    );
  });
});
