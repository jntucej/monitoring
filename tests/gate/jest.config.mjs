// tests/gate/jest.config.mjs
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');

const shared = {
  rootDir: root,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^next/server$': '<rootDir>/tests/gate/helpers/next-server.ts',
    '^next/navigation$': '<rootDir>/tests/gate/helpers/next-navigation.ts',
    '\\.(css|scss)$': 'identity-obj-proxy',
    '\\.(png|jpg|jpeg|svg|webp)$': '<rootDir>/tests/gate/helpers/file-stub.ts',
    '^framer-motion$': '<rootDir>/tests/gate/helpers/framer-motion.mock.ts',
    '^qrcode\\.react$': '<rootDir>/tests/gate/helpers/qrcode.mock.tsx',
    '^react-qrcode-logo$': '<rootDir>/tests/gate/helpers/qrcode.mock.tsx',
    '^jsqr$': '<rootDir>/tests/gate/helpers/jsqr.mock.ts',
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
  testTimeout: 15_000,
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
};

/** @type {import('jest').Config} */
export default {
  projects: [
    {
      ...shared,
      displayName: 'node',
      testEnvironment: 'node',
      roots: ['<rootDir>/tests/gate/policy', '<rootDir>/tests/gate/service',
              '<rootDir>/tests/gate/routes', '<rootDir>/tests/gate/auth',
              '<rootDir>/tests/gate/e2e', '<rootDir>/tests/gate/lib'],
      testMatch: ['**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/gate/jest.setup.node.ts'],
    },
    {
      ...shared,
      displayName: 'ui',
      testEnvironment: 'jsdom',
      testEnvironmentOptions: { url: 'http://localhost:3000' },
      roots: ['<rootDir>/tests/gate/ui', '<rootDir>/tests/gate/integration',
              '<rootDir>/tests/gate/auth'],
      testMatch: ['**/*.test.tsx', '**/*.test.ts'],
      testPathIgnorePatterns: ['-api\\.test\\.ts$'],
      setupFilesAfterEnv: ['<rootDir>/tests/gate/jest.setup.ui.ts'],
    },
  ],
};
