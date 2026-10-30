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
  ...shared,
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/gate'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/gate/jest.setup.node.ts'],
};
