// tests/gate/service/record-scan.test.ts
jest.mock('@/server/repositories/lockdown/findActive');
jest.mock('@/server/repositories/gates/findById');
jest.mock('@/server/repositories/users/findByUniqueId');
jest.mock('@/server/repositories/occupancy/findByUserId');
jest.mock('@/server/repositories/studentDetails/findByUserId');
jest.mock('@/server/repositories/scans/create');
jest.mock('@/server/repositories/scans/findById');
jest.mock('@/server/repositories/scans/findLastByUserId');
jest.mock('@/server/services/audit/write');
jest.mock('@/lib/postgres');
jest.mock('@/lib/gate-operations', () => ({
  getGateMode: jest.fn().mockResolvedValue('OPEN'),
  assertScansAllowed: jest.requireActual('@/lib/gate-operations').assertScansAllowed,
}));
jest.mock('@/server/policy/gate-schedule', () => ({
  checkGateSchedule: jest.fn().mockResolvedValue({ allowed: true }),
}));
jest.mock('@/metrics', () => ({
  metricsRegistry: {
    incGateScan: jest.fn(),
  },
}));
jest.mock('@/lib/db', () => ({
  setUserFlag: jest.fn().mockResolvedValue(true),
  addNotification: jest.fn().mockResolvedValue(undefined),
  getStudentGuardianLink: jest.fn().mockResolvedValue('PAR-1'),
}));
jest.mock('@/lib/integrations/sms', () => ({
  sendSMS: jest.fn().mockResolvedValue({ success: true }),
}));

import { recordScan } from '@/server/services/scan/record';
import { findActiveLockdown } from '@/server/repositories/lockdown/findActive';
import { findGateById } from '@/server/repositories/gates/findById';
import { findByUniqueId } from '@/server/repositories/users/findByUniqueId';
import { findOccupancyByUserId } from '@/server/repositories/occupancy/findByUserId';
import { findStudentDetailsByUserId, updateEntryType } from '@/server/repositories/studentDetails/findByUserId';
import { createScan } from '@/server/repositories/scans/create';
import { findScanById } from '@/server/repositories/scans/findById';
import { findLastMovementByUserId } from '@/server/repositories/scans/findLastByUserId';
import { auditWrite } from '@/server/services/audit/write';
import { query } from '@/lib/postgres';
import { setUserFlag, addNotification, getStudentGuardianLink } from '@/lib/db';
import { sendSMS } from '@/lib/integrations/sms';
import { getGateMode } from '@/lib/gate-operations';
import { checkGateSchedule } from '@/server/policy/gate-schedule';
import { metricsRegistry } from '@/metrics';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  LockedError,
  NotFoundError,
  ServiceUnavailableError,
} from '@/server/http/errors';

const m = {
  findActiveLockdown: findActiveLockdown as jest.Mock,
  findGateById: findGateById as jest.Mock,
  findByUniqueId: findByUniqueId as jest.Mock,
  findOccupancyByUserId: findOccupancyByUserId as jest.Mock,
  findStudentDetailsByUserId: findStudentDetailsByUserId as jest.Mock,
  updateEntryType: updateEntryType as jest.Mock,
  createScan: createScan as jest.Mock,
  findScanById: findScanById as jest.Mock,
  findLastMovementByUserId: findLastMovementByUserId as jest.Mock,
  auditWrite: auditWrite as jest.Mock,
  query: query as jest.Mock,
  setUserFlag: setUserFlag as jest.Mock,
  getGateMode: getGateMode as jest.Mock,
  checkGateSchedule: checkGateSchedule as jest.Mock,
  incGateScan: metricsRegistry.incGateScan as jest.Mock,
  addNotification: addNotification as jest.Mock,
  getStudentGuardianLink: getStudentGuardianLink as jest.Mock,
  sendSMS: sendSMS as jest.Mock,
};

const baseInput = {
  roll: '24JJ1A0501',
  direction: 'IN' as const,
  entryType: 'hosteller' as const,
  gateId: 'G-1',
  operatorId: 'OP',
  operatorName: 'Operator',
  operatorRole: 'operator',
  operatorGateId: 'G-1',
  supervisedGates: null,
  isManual: false,
};

function primeWorld() {
  m.findActiveLockdown.mockResolvedValue(null);
  m.findGateById.mockImplementation(async (id: string) => {
    if (id === 'G-1') {
      return {
        id: 'G-1', gate_code: 'MAIN', name: 'Main', location: 'Front',
        is_active: true, latitude: null, longitude: null, allowed_radius_meters: null,
      };
    }
    if (id === 'G-2') {
      return {
        id: 'G-2', gate_code: 'SIDE', name: 'Side', location: 'Side',
        is_active: true, latitude: null, longitude: null, allowed_radius_meters: null,
      };
    }
    return null;
  });
  m.findByUniqueId.mockResolvedValue({
    id: 'U-1', unique_id: '24JJ1A0501', name: 'Student',
    role: 'student', status: 'ACTIVE', photo_url: null,
  });
  m.findOccupancyByUserId.mockResolvedValue(null);
  m.findStudentDetailsByUserId.mockResolvedValue({
    user_id: 'U-1', current_entry_type: 'hosteller',
    type_chosen_at: null, type_chosen_at_gate: null,
  });
  m.findLastMovementByUserId.mockResolvedValue(null);
  m.createScan.mockResolvedValue({
    isDuplicate: false,
    log: { id: 'S-1', user_id: 'U-1', direction: 'IN' },
  });
  m.query.mockResolvedValue({ rows: [], rowCount: 0 });
  m.getGateMode.mockResolvedValue('OPEN');
  m.checkGateSchedule.mockResolvedValue({ allowed: true });
  m.setUserFlag.mockResolvedValue(true);
  m.getStudentGuardianLink.mockResolvedValue('PAR-1');
  m.addNotification.mockResolvedValue(undefined);
  m.sendSMS.mockResolvedValue({ success: true });
}

beforeEach(() => {
  jest.resetAllMocks();
  primeWorld();
});

// ─── Lockdown ──────────────────────────────────────────────────────────
describe('recordScan — lockdown', () => {
  it('rejects with LOCKED when campus is locked down', async () => {
    m.findActiveLockdown.mockResolvedValueOnce({ id: 'L', scopes: [], message: 'Evacuate' });
    await expect(recordScan(baseInput)).rejects.toBeInstanceOf(LockedError);
  });

  it('allows scans outside a gate-scoped lockdown', async () => {
    m.findActiveLockdown.mockResolvedValueOnce({ id: 'L', scopes: ['G-OTHER'], message: '' });
    await expect(recordScan(baseInput)).resolves.toBeDefined();
  });
});

// ─── Gate existence & operator match ────────────────────────────────────
describe('recordScan — gate & operator match', () => {
  it('404s when the gate does not exist', async () => {
    m.findGateById.mockResolvedValueOnce(null);
    await expect(recordScan(baseInput)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('403s when operator scans another gate', async () => {
    await expect(recordScan({ ...baseInput, gateId: 'G-2' })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('allows a supervisor at a supervised gate', async () => {
    await expect(recordScan({
      ...baseInput,
      operatorRole: 'supervisor',
      operatorGateId: 'G-1',
      supervisedGates: ['G-2'],
      gateId: 'G-2',
    })).resolves.toBeDefined();
  });
});

// ─── Roll validation ───────────────────────────────────────────────────
describe('recordScan — roll validation', () => {
  it('400s with an empty roll', async () => {
    await expect(recordScan({ ...baseInput, roll: '' })).rejects.toBeInstanceOf(BadRequestError);
  });

  it('404s when the roll is unknown', async () => {
    m.findByUniqueId.mockResolvedValueOnce(null);
    await expect(recordScan(baseInput)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('403s when the account is SUSPENDED', async () => {
    m.findByUniqueId.mockResolvedValueOnce({
      id: 'U-1', unique_id: '24JJ1A0501', name: 'Student',
      role: 'student', status: 'SUSPENDED', photo_url: null,
    });
    await expect(recordScan(baseInput)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

// ─── Same-direction occupancy guard ────────────────────────────────────
describe('recordScan — occupancy direction guard', () => {
  it('409 CONFLICT when IN is scanned for a user already IN', async () => {
    m.findOccupancyByUserId.mockResolvedValueOnce({
      user_id: 'U-1', current_status: 'IN', last_gate_id: 'G-1', last_updated: 'x',
    });
    await expect(recordScan(baseInput)).rejects.toBeInstanceOf(ConflictError);
  });

  it('409 CONFLICT when OUT is scanned for a user already OUT', async () => {
    m.findOccupancyByUserId.mockResolvedValueOnce({
      user_id: 'U-1', current_status: 'OUT', last_gate_id: 'G-1', last_updated: 'x',
    });
    await expect(recordScan({ ...baseInput, direction: 'OUT', entryType: undefined }))
      .rejects.toBeInstanceOf(ConflictError);
  });
});

// ─── Entry-type scope on IN scans ──────────────────────────────────────
describe('recordScan — IN entry-type enforcement', () => {
  it('400s ENTRY_TYPE_REQUIRED when IN scan omits entryType', async () => {
    await expect(
      recordScan({ ...baseInput, direction: 'IN', entryType: undefined }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('400s ENTRY_TYPE_MISMATCH when pinning to return_to_hostel after a day_pass', async () => {
    m.findLastMovementByUserId.mockResolvedValueOnce({
      user_id: 'U-1', direction: 'OUT', reason: 'day_pass', timestamp: '2026-10-01T00:00:00Z',
    });
    await expect(
      recordScan({ ...baseInput, direction: 'IN', entryType: 'day_scholar' }),
    ).rejects.toMatchObject({ code: 'ENTRY_TYPE_MISMATCH' });
  });

  it('writes the entry type on a valid IN scan', async () => {
    const out = await recordScan({ ...baseInput, direction: 'IN', entryType: 'hosteller' });
    expect(out.person.id).toBe('U-1');
    expect(m.updateEntryType).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'U-1', entryType: 'hosteller' }),
    );
  });
});

// ─── OUT entry-type enforcement ─────────────────────────────────────
describe('recordScan — OUT entry-type enforcement', () => {
  it('allows OUT daily_outing for a hosteller', async () => {
    m.findOccupancyByUserId.mockResolvedValueOnce({
      user_id: 'U-1', current_status: 'IN', last_gate_id: 'G-1', last_updated: 'x',
    });
    m.findLastMovementByUserId.mockResolvedValueOnce({
      user_id: 'U-1', direction: 'IN', reason: null, timestamp: new Date().toISOString(),
    });
    await expect(
      recordScan({ ...baseInput, direction: 'OUT', entryType: undefined, reason: 'daily_outing' }),
    ).resolves.toBeDefined();
  });

  it('409 HOSTEL_SCOPE_MISMATCH when a day_scholar uses daily_outing', async () => {
    m.findOccupancyByUserId.mockResolvedValueOnce({
      user_id: 'U-1', current_status: 'IN', last_gate_id: 'G-1', last_updated: 'x',
    });
    m.findStudentDetailsByUserId.mockResolvedValueOnce({
      user_id: 'U-1', current_entry_type: 'day_scholar',
      type_chosen_at: null, type_chosen_at_gate: null,
    });
    await expect(
      recordScan({ ...baseInput, direction: 'OUT', entryType: undefined, reason: 'daily_outing' }),
    ).rejects.toMatchObject({ code: 'HOSTEL_SCOPE_MISMATCH' });
  });
});

// ─── Pass check via validateStudentExitFlow ────────────────────────────
describe('recordScan — pass enforcement', () => {
  it('403 NO_GATE_PASS when home_out has no approved pass', async () => {
    m.findOccupancyByUserId.mockResolvedValueOnce({
      user_id: 'U-1', current_status: 'IN', last_gate_id: 'G-1', last_updated: 'x',
    });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const exitFlow = require('@/lib/student-exit-flow');
    jest.spyOn(exitFlow, 'validateStudentExitFlow').mockResolvedValueOnce({
      allowed: false, canonicalReason: 'home_out', requiresPass: true,
      error: 'NO_GATE_PASS',
    });
    await expect(
      recordScan({ ...baseInput, direction: 'OUT', entryType: undefined, reason: 'home_out' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('records OUT home_out when a pass is valid', async () => {
    m.findOccupancyByUserId.mockResolvedValueOnce({
      user_id: 'U-1', current_status: 'IN', last_gate_id: 'G-1', last_updated: 'x',
    });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const exitFlow = require('@/lib/student-exit-flow');
    jest.spyOn(exitFlow, 'validateStudentExitFlow').mockResolvedValueOnce({
      allowed: true, canonicalReason: 'home_out', requiresPass: true, passId: 'P-1',
    });
    await expect(
      recordScan({ ...baseInput, direction: 'OUT', entryType: undefined, reason: 'home_out' }),
    ).resolves.toBeDefined();
  });
});

// ─── OUT duration cap ─────────────────────────────────────────────────
describe('recordScan — OUT duration cap', () => {
  it('rejects a daily_outing OUT scan after 2h (cap = 1h)', async () => {
    m.findOccupancyByUserId.mockResolvedValueOnce({
      user_id: 'U-1', current_status: 'IN', last_gate_id: 'G-1', last_updated: 'x',
    });
    // last IN was 2h ago
    m.findLastMovementByUserId.mockResolvedValueOnce({
      user_id: 'U-1', direction: 'IN', reason: null,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    });
    await expect(
      recordScan({ ...baseInput, direction: 'OUT', entryType: undefined, reason: 'daily_outing' }),
    ).rejects.toMatchObject({ code: 'DAILY_OUTING_OVERDUE' });
  });

  it('rejects a day_pass OUT scan after 13h (cap = 12h)', async () => {
    m.findOccupancyByUserId.mockResolvedValueOnce({
      user_id: 'U-1', current_status: 'IN', last_gate_id: 'G-1', last_updated: 'x',
    });
    m.findLastMovementByUserId.mockResolvedValueOnce({
      user_id: 'U-1', direction: 'IN', reason: null,
      timestamp: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(),
    });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const exitFlow = require('@/lib/student-exit-flow');
    jest.spyOn(exitFlow, 'validateStudentExitFlow').mockResolvedValueOnce({
      allowed: true, canonicalReason: 'day_pass', requiresPass: true, passId: 'P-1',
    });
    await expect(
      recordScan({ ...baseInput, direction: 'OUT', entryType: undefined, reason: 'day_pass' }),
    ).rejects.toMatchObject({ code: 'DAY_PASS_OVERDUE' });
  });

  it('home_out has no cap — succeeds even after 72h', async () => {
    m.findOccupancyByUserId.mockResolvedValueOnce({
      user_id: 'U-1', current_status: 'IN', last_gate_id: 'G-1', last_updated: 'x',
    });
    m.findLastMovementByUserId.mockResolvedValueOnce({
      user_id: 'U-1', direction: 'IN', reason: null,
      timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const exitFlow = require('@/lib/student-exit-flow');
    jest.spyOn(exitFlow, 'validateStudentExitFlow').mockResolvedValueOnce({
      allowed: true, canonicalReason: 'home_out', requiresPass: true, passId: 'P-1',
    });
    await expect(
      recordScan({ ...baseInput, direction: 'OUT', entryType: undefined, reason: 'home_out' }),
    ).resolves.toBeDefined();
  });

  it('flags OVERDUE on IN return when student was out on daily_outing for longer than cap (1h)', async () => {
    m.findOccupancyByUserId.mockResolvedValueOnce({
      user_id: 'U-1', current_status: 'OUT', last_gate_id: 'G-1', last_updated: 'x',
    });
    // last OUT was 3h ago on daily_outing
    m.findLastMovementByUserId.mockResolvedValueOnce({
      user_id: 'U-1', direction: 'OUT', reason: 'daily_outing',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    });

    const res = await recordScan({
      ...baseInput,
      direction: 'IN',
      entryType: 'hosteller',
      reason: 'return_to_hostel',
    });
    expect(res).toBeDefined();
    expect(m.setUserFlag).toHaveBeenCalledWith('U-1', 'OVERDUE', 'U-1');
  });
});

// ─── IN home_in guard ──────────────────────────────────────────────────
describe('recordScan — home_in with no prior OUT', () => {
  it('400s NO_PRIOR_HOME_OUT', async () => {
    m.findLastMovementByUserId.mockResolvedValueOnce(null); // no prior OUT
    await expect(
      recordScan({ ...baseInput, direction: 'IN', entryType: 'hosteller', reason: 'home_in' }),
    ).rejects.toMatchObject({ code: 'NO_PRIOR_HOME_OUT' });
  });
});

// ─── Duplicate scans ──────────────────────────────────────────────────
describe('recordScan — duplicate scan', () => {
  it('returns the existing row with isDuplicate=true, no new insert', async () => {
    m.createScan.mockResolvedValueOnce({ isDuplicate: true, log: { id: 'S-EXISTING' } });
    m.findScanById.mockResolvedValueOnce({ id: 'S-EXISTING', user_id: 'U-1', direction: 'IN' });
    const out = await recordScan(baseInput);
    expect(out.isDuplicate).toBe(true);
    expect(out.log.id).toBe('S-EXISTING');
  });
});

// ─── Audit ────────────────────────────────────────────────────────────
describe('recordScan — audit', () => {
  it('writes an audit row on the happy path', async () => {
    await recordScan(baseInput);
    expect(m.auditWrite).toHaveBeenCalledWith(
      expect.objectContaining({ action: expect.stringMatching(/GATE_SCAN|SCAN_CREATED/) }),
    );
  });

  it('does NOT write an audit row on duplicate', async () => {
    m.createScan.mockResolvedValueOnce({ isDuplicate: true, log: { id: 'S-EXISTING' } });
    m.findScanById.mockResolvedValueOnce({ id: 'S-EXISTING', user_id: 'U-1', direction: 'IN' });
    await recordScan(baseInput);
    const calls = m.auditWrite.mock.calls.map((c) => c[0]?.action);
    expect(calls).not.toContain('GATE_SCAN_RECORDED');
  });
});

// ─── Non-student person types ──────────────────────────────────────────
describe('recordScan — non-student', () => {
  it('skips entry-type enforcement for faculty/staff', async () => {
    m.findByUniqueId.mockResolvedValueOnce({
      id: 'F-1', unique_id: '24JJ1A0501', name: 'Faculty',
      role: 'faculty', status: 'ACTIVE', photo_url: null,
    });
    const out = await recordScan({ ...baseInput, personId: 'F-1', roll: '24JJ1A0501', entryType: undefined });
    expect(out.person.role).toBe('faculty');
    expect(m.updateEntryType).not.toHaveBeenCalled();
  });
});

// ─── Gate Operating Mode ──────────────────────────────────────────────
describe('recordScan — gate operating mode', () => {
  it('rejects scan when gate is in MAINTENANCE mode', async () => {
    m.getGateMode.mockResolvedValueOnce('MAINTENANCE');
    await expect(recordScan(baseInput)).rejects.toThrow(ServiceUnavailableError);
    expect(m.auditWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SCAN_REJECTED',
        details: expect.objectContaining({ code: 'MAINTENANCE_ACTIVE' }),
      }),
    );
  });

  it('allows scan in MAINTENANCE mode with emergency reason override', async () => {
    m.getGateMode.mockResolvedValueOnce('MAINTENANCE');
    const res = await recordScan({ ...baseInput, reason: 'emergency' });
    expect(res).toBeDefined();
  });

  it('rejects scan in CURFEW mode without override reason', async () => {
    m.getGateMode.mockResolvedValueOnce('CURFEW');
    await expect(recordScan({ ...baseInput, reason: undefined })).rejects.toThrow(ForbiddenError);
    expect(m.auditWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SCAN_REJECTED',
        details: expect.objectContaining({ code: 'CURFEW_ACTIVE' }),
      }),
    );
  });
});

// ─── Gate Inactivity & Schedule Policy ────────────────────────────────
describe('recordScan — gate inactive & schedule enforcement', () => {
  it('rejects scan when gate is marked is_active = false', async () => {
    m.findGateById.mockResolvedValueOnce({
      id: 'G-1', gate_code: 'MAIN', name: 'Main', location: 'Front',
      is_active: false, latitude: null, longitude: null, allowed_radius_meters: null,
    });
    await expect(recordScan(baseInput)).rejects.toThrow(LockedError);
    expect(m.auditWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SCAN_REJECTED',
        details: expect.objectContaining({ code: 'GATE_INACTIVE' }),
      }),
    );
  });

  it('rejects scan when gate schedule check disallows entry', async () => {
    m.checkGateSchedule.mockResolvedValueOnce({
      allowed: false,
      code: 'GATE_CLOSED_HOLIDAY',
      reason: 'Gate closed for holiday: Diwali',
    });
    await expect(recordScan(baseInput)).rejects.toThrow(ForbiddenError);
    expect(m.auditWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SCAN_REJECTED',
        details: expect.objectContaining({ code: 'GATE_CLOSED_HOLIDAY' }),
      }),
    );
  });
});

// ─── Prometheus Scan Metric & Pass Gate Scoping ───────────────────────
describe('recordScan — metrics & pass scoping', () => {
  it('increments Prometheus gate scan counter on successful scan', async () => {
    await recordScan(baseInput);
    expect(m.incGateScan).toHaveBeenCalledWith('G-1', 'IN');
  });

  it('audits SCAN_REJECTED on rejection', async () => {
    m.findGateById.mockResolvedValueOnce(null);
    await expect(recordScan(baseInput)).rejects.toThrow(NotFoundError);
    expect(m.auditWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SCAN_REJECTED',
        details: expect.objectContaining({ code: 'NOT_FOUND' }),
      }),
    );
  });

  it('notifies linked guardian on student movement scan', async () => {
    (query as jest.Mock).mockResolvedValueOnce({ rows: [{ phone: '+919999999999' }] });
    await recordScan(baseInput);
    // Allow microtask queue for async parent notification fire-and-forget
    await new Promise((r) => setTimeout(r, 10));
    expect(addNotification).toHaveBeenCalledWith(
      'user',
      'PAR-1',
      'movement',
      expect.stringContaining('Campus Movement'),
      expect.stringContaining('entered campus'),
      'G-1',
    );
    expect(sendSMS).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+919999999999',
        message: expect.stringContaining('entered campus'),
      }),
    );
  });
});
