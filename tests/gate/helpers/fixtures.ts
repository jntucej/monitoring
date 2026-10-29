// tests/gate/helpers/fixtures.ts
export const TEST_OPERATOR = {
  id: 'OP-UUID-0001',
  uniqueId: 'OPERATOR',
  name: 'Test Operator',
  email: 'operator@test.in',
  role: 'operator' as const,
  gateId: 'G-MAIN-UUID',
  status: 'ACTIVE' as const,
  passwordHash: '$2a$10$example.hash.placeholder.not.used.by.mocked.db',
};

export const TEST_STUDENT = {
  id: 'STU-UUID-0001',
  uniqueId: '24JJ1A0501',
  name: 'Ravi Kumar',
  role: 'student' as const,
  status: 'ACTIVE' as const,
  photoUrl: null,
  studentDetails: {
    roll: '24JJ1A0501',
    year: 3,
    section: 'A',
    hostelBlock: 'BH-2',
    roomNumber: '204',
    currentEntryType: 'hosteller' as const,
  },
};

export const TEST_GATE = {
  id: 'G-MAIN-UUID',
  gateCode: 'MAIN',
  name: 'Main Gate',
  location: 'Front Entrance',
  type: 'main' as const,
  isActive: true,
};

export const TEST_SCAN = {
  id: 'SCAN-UUID-0001',
  roll: '24JJ1A0501',
  uniqueId: '24JJ1A0501',
  name: 'Ravi Kumar',
  personType: 'student' as const,
  direction: 'IN' as const,
  gateId: 'G-MAIN-UUID',
  gateName: 'Main Gate',
  operatorId: 'OP-UUID-0001',
  operatorName: 'Test Operator',
  timestamp: new Date().toISOString(),
  isManual: false,
  isCorrection: false,
};
