/**
 * tests/gate/service/mess-v2-scan.test.ts — Mess v2 service hard guards:
 *   - Replay: same QR twice → second returns outcome='duplicate'
 *   - Wrong session: outside meal window → outcome='wrong_session'
 *   - Special item: 80% running_low notification once, 100% sold_out notification once
 *   - Interest poll: participation < 40% → status='closed' with participation_failed=true
 */
const mockQuery = jest.fn();
const mockPublish = jest.fn(async () => ({ sent: 1 }));

jest.mock("@/lib/postgres", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

jest.mock("@/lib/notifications/bus", () => ({
  publishNotification: (...args: unknown[]) => mockPublish(...args),
}));

import { buildQr, currentTotp, encryptSecret } from "@/lib/mess/totp";
import { verifyAndRedeem } from "@/lib/mess/scan";
import { finalizeInterestPoll } from "@/lib/mess/interest";

const SID = "11111111-1111-4111-8111-111111111111";
const SES = "22222222-2222-4222-8222-222222222222";
const CNT = "33333333-3333-4333-8333-333333333333";
const OP = "44444444-4444-4444-8444-444444444444";
const DEV = "55555555-5555-4555-8555-555555555555";
const DAILY_HEX = "0123456789abcdef0123456789abcdef01234567";

describe("Mess v2 scan & interest hard guards", () => {
  beforeEach(() => {
    process.env.MESS_TOKEN_SECRET = "unit-test-mess-v2-secret";
    mockQuery.mockReset();
    mockPublish.mockClear();
  });

  it("replay: same QR twice → second returns outcome='duplicate'", async () => {
    const opensAt = new Date(Date.now() - 60_000).toISOString();
    const closesAt = new Date(Date.now() + 3600_000).toISOString();
    const enc = encryptSecret(DAILY_HEX);
    const totp = currentTotp(DAILY_HEX, new Date(opensAt).getTime());
    const qr = buildQr(SID, SES, 1, totp);

    let stateCalls = 0;
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM public.mess_days")) {
        return { rows: [{ id: SES, meal_date: "2026-11-25", meal_type: "lunch", window_opens_at: opensAt, window_closes_at: closesAt, is_active: true }] };
      }
      if (sql.includes("FROM public.mess_totp_secrets")) {
        return { rows: [{ secret_enc: enc }] };
      }
      if (sql.includes("INSERT INTO public.mess_totp_state")) {
        stateCalls++;
        return { rows: stateCalls === 1 ? [{ student_id: SID }] : [] };
      }
      if (sql.includes("UPDATE public.mess_special_schedules")) {
        return { rows: [] };
      }
      if (sql.includes("FROM public.users")) {
        return { rows: [{ name: "Alice", unique_id: "23JJ1A0501" }] };
      }
      return { rows: [] };
    });

    const r1 = await verifyAndRedeem({ qr, session_id: SES, counter_id: CNT, operator_id: OP, device_id: DEV });
    const r2 = await verifyAndRedeem({ qr, session_id: SES, counter_id: CNT, operator_id: OP, device_id: DEV });
    expect(r1.outcome).toBe("ok");
    expect(r2.outcome).toBe("duplicate");
  });

  it("wrong session: scan outside meal window → outcome='wrong_session'", async () => {
    const opensAt = new Date(Date.now() - 7200_000).toISOString();
    const closesAt = new Date(Date.now() - 3600_000).toISOString();
    const totp = currentTotp(DAILY_HEX, new Date(opensAt).getTime());
    const qr = buildQr(SID, SES, 1, totp);

    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM public.mess_days")) {
        return { rows: [{ id: SES, meal_date: "2026-11-25", meal_type: "lunch", window_opens_at: opensAt, window_closes_at: closesAt, is_active: true }] };
      }
      return { rows: [] };
    });

    const r = await verifyAndRedeem({ qr, session_id: SES, counter_id: CNT, operator_id: OP, device_id: DEV });
    expect(r.outcome).toBe("wrong_session");
  });

  it("special item: 80% triggers running_low once, 100% triggers sold_out once", async () => {
    const opensAt = new Date(Date.now() - 60_000).toISOString();
    const closesAt = new Date(Date.now() + 3600_000).toISOString();
    const enc = encryptSecret(DAILY_HEX);
    const totp = currentTotp(DAILY_HEX, new Date(opensAt).getTime());
    const qr = buildQr(SID, SES, 1, totp);

    let scanNum = 0;
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM public.mess_days")) {
        return { rows: [{ id: SES, meal_date: "2026-11-25", meal_type: "lunch", window_opens_at: opensAt, window_closes_at: closesAt, is_active: true }] };
      }
      if (sql.includes("FROM public.mess_totp_secrets")) {
        return { rows: [{ secret_enc: enc }] };
      }
      if (sql.includes("INSERT INTO public.mess_totp_state")) {
        return { rows: [{ student_id: SID }] };
      }
      if (sql.includes("UPDATE public.mess_special_schedules") && sql.includes("RETURNING")) {
        scanNum++;
        if (scanNum === 1) {
          return { rows: [{ id: "sp-1", item_name: "Paneer Tikka", expected_count: 10, served_count: 8, low_threshold: "0.20", status: "live", low_notified_at: null, sold_out_notified_at: null }] };
        }
        return { rows: [{ id: "sp-1", item_name: "Paneer Tikka", expected_count: 10, served_count: 10, low_threshold: "0.20", status: "sold_out", low_notified_at: "2026-11-25T12:00:00Z", sold_out_notified_at: null }] };
      }
      if (sql.includes("FROM public.users")) {
        return { rows: [{ name: "Alice", unique_id: "23JJ1A0501" }] };
      }
      return { rows: [] };
    });

    const r1 = await verifyAndRedeem({ qr, session_id: SES, counter_id: CNT, operator_id: OP, device_id: DEV });
    const r2 = await verifyAndRedeem({ qr, session_id: SES, counter_id: CNT, operator_id: OP, device_id: DEV });
    expect(r1.special_subline).toContain("2/10 remaining");
    expect(r2.special_subline).toContain("sold out");
    expect(mockPublish).toHaveBeenCalledTimes(2);
    expect((mockPublish.mock.calls[0] as unknown[])[0]).toMatchObject({ eventType: "mess.special.running_low" });
    expect((mockPublish.mock.calls[1] as unknown[])[0]).toMatchObject({ eventType: "mess.special.sold_out" });
  });

  it("interest poll: participation < 40% → status='closed' with participation_failed=true", async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM public.mess_interest_polls")) {
        return { rows: [{ id: "poll-1", proposed_item: "Paneer Tikka", meal_type: "lunch", scheduled_for: null, counter_id: null, target_scope: "mess", participation_min: "0.40", approval_min: "0.60" }] };
      }
      if (sql.includes("FROM public.mess_eligibility")) {
        return { rows: [{ cnt: "100" }] };
      }
      if (sql.includes("FROM public.mess_interest_votes")) {
        // 10 yes votes out of 100 = 10% participation (< 40%), even though 100% yes
        return { rows: Array.from({ length: 10 }, () => ({ vote: "yes", is_recent: true })) };
      }
      return { rows: [] };
    });

    const res = await finalizeInterestPoll("poll-1", OP);
    expect(res?.status).toBe("closed");
    expect(res?.evaluation.participation_failed).toBe(true);
  });
});
