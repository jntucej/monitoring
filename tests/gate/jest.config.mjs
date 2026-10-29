// tests/gate/jest.config.mjs
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');

/** @type {import('jest').Config} */
export default {
  rootDir: root,
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/gate'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/gate/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^next/server$': '<rootDir>/tests/gate/helpers/next-server.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jose)/)',
  ],
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      isolatedModules: true,
      diagnostics: { warnOnly: true },
    }],
  },
  collectCoverageFrom: [
    'src/server/policy/gate-access.ts',
    'src/server/policy/lockdown.ts',
    'src/server/policy/student-exit.ts',
    'src/server/policy/gate-scope.ts',
    'src/server/services/scan/record.ts',
    'src/lib/claim-codes.ts',
    'src/lib/qr-token.ts',
    'src/lib/barcode.ts',
    'src/lib/operator-recommend.ts',
    'src/lib/rate-limit.ts',
    'src/lib/csrf.ts',
    'src/server/http/trusted-headers.ts',
    'src/server/http/cron-auth.ts',
  ],
  testTimeout: 10_000,
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
};
