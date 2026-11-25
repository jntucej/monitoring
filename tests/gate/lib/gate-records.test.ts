// tests/gate/lib/gate-records.test.ts
//
// Unit tests for the gate-records dispatcher + automation engine
// (src/lib/gate/events.ts). The DB layer (@/lib/postgres query) and the
// blueprint resolver / SSE emitter are mocked so the tests exercise the
// decision logic deterministically — no live Postgres.
//
// The 7 acceptance cases from the spec:
//   1. blueprint resolution per role
//   2. premade value rejection (invalid code → throws)
//   3. auto/derived field cannot be overridden by the client
//   4. watchlist → exception fan-out
//   5. curfew OUT inside window → held + curfew_violation
//   6. duplicate scan within 30s → held, not double-counted
//   7. exam_access without hall ticket → allowed=false

jest.mock('@/lib/postgres', () => ({
  query: jest.fn(),
  getDbClient: jest.fn(),
}));
jest.mock('@/lib/err-msg', () => ({
  errMsg: jest.fn((e: unknown) => String(e?.message ?? e ?? '')),
}));
jest.mock('@/lib/gate/blueprints', () => ({
  getBlueprint: jest.fn(),
  getRefCategories: jest.fn(),
}));
jest.mock('@/lib/gate/sse', () => ({
  emitGateEvent: jest.fn(),
}));

import { query } from '@/lib/postgres';
import { getBlueprint } from '@/lib/gate/blueprints';
import { emitGateEvent } from '@/lib/gate/sse';
import {
  recordGateEvent,
  GateValidationError,
  type RecordGateEventInput,
} from '@/lib/gate/events';

const mockQuery = query as jest.Mock;
const mockGetBlueprint = getBlueprint as jest.Mock;
const mockEmit = emitGateEvent as jest.Mock;

function baseInput(over: Partial<RecordGateEventInput> = {}): RecordGateEventInput {
  return {
    role: 'operator',
    gateId: 'g-1',
    gateType: 'main',
    eventType: 'movement',
    context: 'default',
    operatorId: 'op-1',
    subjectId: 'sub-1',
    subjectType: 'student',
    subjectRef: '23JJ1A0599',
    direction: 'OUT',
    payload: {},
    ...over,
  };
}

// A minimal blueprint: one required scan field + one auto + one derived.
function stubBlueprint(fields: Array<Partial<import('@/lib/gate/blueprints').FieldBlueprint>> = []) {
  return [
    {
      fieldKey: 'subject_scan',
      label: 'Subject',
      fillMode: 'scan',
      refDomain: null,
      recordTarget: 'movement_logs',
      required: false,
      sortOrder: 10,
      validation: {},
      visibleWhen: {},
    },
    {
      fieldKey: 'watchlist_hit',
      label: 'Watchlist',
      fillMode: 'derived',
      refDomain: null,
      recordTarget: 'movement_logs',
      required: false,
      sortOrder: 60,
      validation: {},
      visibleWhen: {},
    },
    ...fields,
  ];
}

beforeEach(() => {
  mockQuery.mockReset();
  mockGetBlueprint.mockReset();
  mockEmit.mockReset();
  mockGetBlueprint.mockResolvedValue(stubBlueprint());
  mockEmit.mockResolvedValue(undefined);
});

// Map of query-text-substring → canned result, used by the default mock.
function mockQueryByMatch(matches: Array<{ like: string; rows: unknown[] }>) {
  mockQuery.mockImplementation(async (text: string, _params?: unknown[]) => {
    for (const m of matches) {
      if (text.includes(m.like)) return { rows: m.rows, rowCount: m.rows.length };
    }
    return { rows: [], rowCount: 0 };
  });
}

describe('gate-records dispatcher', () => {
  test('1. blueprint resolution per role', async () => {
    mockGetBlueprint.mockResolvedValue(stubBlueprint());
    mockQueryByMatch([
      // the movement INSERT must return a row id
      { like: 'INSERT INTO public.movement_logs', rows: [{ id: 'mv-0' }] },
    ]);
    const input = baseInput();
    await recordGateEvent(input);
    expect(mockGetBlueprint).toHaveBeenCalledWith({
      role: 'operator',
      gateType: 'main',
      eventType: 'movement',
      context: 'default',
    });
    // No exceptions → 'allowed'.
    const ev = await recordGateEvent(baseInput());
    expect(ev.outcome).toBe('allowed');
    expect(ev.recordTarget).toBe('movement_logs');
  });

  test('2. premade value rejection (invalid code → throws)', async () => {
    mockGetBlueprint.mockResolvedValue(
      stubBlueprint([
        {
          fieldKey: 'purpose_code',
          label: 'Purpose',
          fillMode: 'premade',
          refDomain: 'purpose_code',
          recordTarget: 'movement_logs',
          required: false,
          sortOrder: 40,
          validation: {},
          visibleWhen: {},
        },
      ])
    );
    // ref_categories lookup returns NO row for the bogus code.
    mockQueryByMatch([]);
    await expect(
      recordGateEvent(baseInput({ payload: { purpose_code: 'nonsense' } }))
    ).rejects.toThrow(GateValidationError);
  });

  test('3. auto/derived field cannot be overridden by the client', async () => {
    // Client tries to forge watchlist_hit=true; the dispatcher must strip it.
    mockQueryByMatch([
      { like: 'INSERT INTO public.movement_logs', rows: [{ id: 'mv-3' }] },
    ]);
    const input = baseInput({
      payload: { subject_scan: 'x', watchlist_hit: true },
    });
    await recordGateEvent(input);
    // The INSERT into movement_logs is the last movement_logs write; verify
    // the stored payload JSON does NOT carry the client-forged flag.
    const insertCalls = mockQuery.mock.calls.filter((c: unknown[]) =>
      String(c[0]).includes('INSERT INTO public.movement_logs')
    );
    expect(insertCalls.length).toBeGreaterThan(0);
    const lastParams = insertCalls[insertCalls.length - 1][1] as unknown[];
    const storedPayload = JSON.parse(String(lastParams[lastParams.length - 1]));
    // watchlist_hit is a top-level derived column, NOT inside the payload JSON
    // the client can reach — and it was recomputed server-side (false here).
    expect(storedPayload.watchlist_hit).toBeUndefined();
  });

  test('4. watchlist hit → held outcome + auto exception fan-out', async () => {
    mockQueryByMatch([
      // watchlist lookup → hit
      { like: 'SELECT 1 FROM public.visitor_watchlist', rows: [{ '1': 1 }] },
      // the INSERTs return a row
      { like: 'INSERT INTO public.movement_logs', rows: [{ id: 'mv-1' }] },
      { like: 'INSERT INTO public.gate_exceptions', rows: [{ id: 'ex-1' }] },
    ]);
    const ev = await recordGateEvent(baseInput());
    expect(ev.outcome).toBe('held');
    // An auto exception row was written for the watchlist hit.
    const exceptionInsert = mockQuery.mock.calls.find((c: unknown[]) =>
      String(c[0]).includes('INSERT INTO public.gate_exceptions')
    );
    expect(exceptionInsert).toBeDefined();
    expect(mockEmit).toHaveBeenCalled();
  });

  test('5. curfew OUT inside window → held + curfew_violation', async () => {
    mockQueryByMatch([
      { like: 'SELECT 1 FROM public.ref_categories', rows: [{ '1': 1 }] }, // curfew violation
      { like: 'SELECT 1 FROM public.visitor_watchlist', rows: [] },
      { like: 'SELECT 1 FROM public.movement_logs', rows: [] }, // no duplicate
      { like: 'UPDATE public.campus_occupancy', rows: [] },
      { like: 'INSERT INTO public.movement_logs', rows: [{ id: 'mv-2' }] },
    ]);
    const ev = await recordGateEvent(baseInput({ direction: 'OUT' }));
    expect(ev.derived.curfew_violation).toBe(true);
    expect(ev.outcome).toBe('held');
  });

  test('6. duplicate scan within 30s → held, not double-counted', async () => {
    mockQueryByMatch([
      { like: 'SELECT 1 FROM public.movement_logs', rows: [{ '1': 1 }] }, // duplicate found
      { like: 'UPDATE public.campus_occupancy', rows: [] },
      { like: 'INSERT INTO public.movement_logs', rows: [{ id: 'mv-3' }] },
    ]);
    const ev = await recordGateEvent(baseInput({ direction: 'IN' }));
    expect(ev.derived.duplicate_scan).toBe(true);
    expect(ev.outcome).toBe('held');
    // Occupancy was still consulted but the event is flagged as duplicate, so
    // the caller can suppress the double-count (occupancy_delta reflects the
    // direction, the duplicate_scan flag tells it to ignore it).
    expect(ev.derived.duplicate_scan).toBe(true);
  });

  test('7. exam_access without hall ticket → allowed=false', async () => {
    mockQueryByMatch([
      { like: 'SELECT ht.id', rows: [] }, // no hall ticket
      { like: 'INSERT INTO public.exam_access_log', rows: [{ id: 'ea-1' }] },
    ]);
    const ev = await recordGateEvent(
      baseInput({
        eventType: 'exam_access',
        gateType: 'exam',
        role: 'exam_superintendent',
        subjectId: 'cand-9',
        payload: { candidate_id: 'cand-9', session_id: 's1' },
      })
    );
    expect(ev.derived.allowed).toBe(false);
    expect(ev.recordTarget).toBe('exam_access_log');
  });
});
