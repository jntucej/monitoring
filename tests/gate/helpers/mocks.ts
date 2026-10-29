// tests/gate/helpers/mocks.ts
import type { RecordScanInput } from '@/server/services/scan/record';

export const mockFindActiveLockdown = jest.fn();
export const mockFindGateById = jest.fn();
export const mockFindByUniqueId = jest.fn();
export const mockFindOccupancyByUserId = jest.fn();
export const mockFindStudentDetailsByUserId = jest.fn();
export const mockUpdateEntryType = jest.fn();
export const mockCreateScan = jest.fn();
export const mockFindScanById = jest.fn();
export const mockFindLastMovementByUserId = jest.fn();
export const mockValidateStudentExitFlow = jest.fn();
export const mockAuditWrite = jest.fn();
export const mockSetUserFlag = jest.fn();
export const mockQuery = jest.fn();

export function installRepoMocks() {
  jest.mock('@/server/repositories/lockdown/findActive', () => ({
    findActiveLockdown: mockFindActiveLockdown,
  }));
  jest.mock('@/server/repositories/gates/findById', () => ({
    findGateById: mockFindGateById,
  }));
  jest.mock('@/server/repositories/users/findByUniqueId', () => ({
    findByUniqueId: mockFindByUniqueId,
  }));
  jest.mock('@/server/repositories/occupancy/findByUserId', () => ({
    findOccupancyByUserId: mockFindOccupancyByUserId,
  }));
  jest.mock('@/server/repositories/studentDetails/findByUserId', () => ({
    findStudentDetailsByUserId: mockFindStudentDetailsByUserId,
    updateEntryType: mockUpdateEntryType,
  }));
  jest.mock('@/server/repositories/scans/create', () => ({
    createScan: mockCreateScan,
  }));
  jest.mock('@/server/repositories/scans/findById', () => ({
    findScanById: mockFindScanById,
  }));
  jest.mock('@/server/repositories/scans/findLastByUserId', () => ({
    findLastMovementByUserId: mockFindLastMovementByUserId,
  }));
  jest.mock('@/lib/student-exit-flow', () => {
    const actual = jest.requireActual('@/lib/student-exit-flow');
    return {
      ...actual,
      validateStudentExitFlow: mockValidateStudentExitFlow,
    };
  });
  jest.mock('@/server/services/audit/write', () => ({
    auditWrite: mockAuditWrite,
  }));
  jest.mock('@/lib/db', () => {
    const actual = jest.requireActual('@/lib/db');
    return { ...actual, setUserFlag: mockSetUserFlag };
  });
  jest.mock('@/lib/postgres', () => ({
    query: mockQuery,
    poolQuery: mockQuery,
    withTransaction: jest.fn(),
    getPostgresPool: jest.fn(),
  }));
}

/** A stable factory for a valid operator IN-scan input. Override per test. */
export function baseScanInput(overrides: Partial<RecordScanInput> = {}): RecordScanInput {
  return {
    roll: '24JJ1A0501',
    direction: 'IN',
    entryType: 'hosteller',
    gateId: 'MAIN-GATE-UUID',
    operatorId: 'OP-UUID',
    operatorName: 'Test Operator',
    operatorRole: 'operator',
    operatorGateId: 'MAIN-GATE-UUID',
    supervisedGates: null,
    isManual: false,
    ...overrides,
  };
}

/** Wire a minimal "healthy" world: gate exists, operator assigned, no lockdown. */
export function primeHappyWorld() {
  mockFindActiveLockdown.mockResolvedValue(null);
  mockFindGateById.mockResolvedValue({
    id: 'MAIN-GATE-UUID',
    gate_code: 'MAIN',
    name: 'Main Gate',
    location: 'Front',
    is_active: true,
    latitude: null,
    longitude: null,
    allowed_radius_meters: null,
  });
  mockFindByUniqueId.mockResolvedValue({
    id: 'USER-UUID',
    unique_id: '24JJ1A0501',
    name: 'Test Student',
    role: 'student',
    status: 'ACTIVE',
    photo_url: null,
  });
  mockFindOccupancyByUserId.mockResolvedValue(null);
  mockFindStudentDetailsByUserId.mockResolvedValue({
    user_id: 'USER-UUID',
    current_entry_type: 'hosteller',
    type_chosen_at: null,
    type_chosen_at_gate: null,
  });
  mockFindLastMovementByUserId.mockResolvedValue(null);
  mockValidateStudentExitFlow.mockResolvedValue({
    allowed: true,
    canonicalReason: 'regular',
    requiresPass: false,
  });
  mockCreateScan.mockResolvedValue({
    isDuplicate: false,
    log: { id: 'SCAN-UUID', user_id: 'USER-UUID', direction: 'IN' },
  });
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockUpdateEntryType.mockResolvedValue(undefined);
  mockAuditWrite.mockResolvedValue(undefined);
  mockSetUserFlag.mockResolvedValue(true);
}
