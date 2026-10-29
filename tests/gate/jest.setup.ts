// tests/gate/jest.setup.ts
// 32-char minimums — requireSecret enforces length.
process.env.NODE_ENV = 'test';
process.env.AUTH_JWT_SECRET =
  'jest-auth-jwt-secret-aaaaaaaaaaaaaaaaaaaa';
process.env.AUTH_JWT_SECRETS =
  'k1:jest-auth-jwt-secret-aaaaaaaaaaaaaaaaaaaa';
process.env.QR_TOKEN_SECRET =
  'jest-qr-token-secret-bbbbbbbbbbbbbbbbbbb';
process.env.MOBILE_TOKEN_SECRET =
  'jest-mobile-token-secret-ccccccccccccccc';
process.env.INTERNAL_MW_SECRET =
  'jest-internal-mw-secret-dddddddddddddddddd';
process.env.METRICS_SCRAPE_TOKEN = 'jest-metrics-token';
process.env.CRON_SECRET = 'jest-cron-secret';
process.env.KIOSK_SESSION_REQUIRE_PIN = 'true';

// Silence pino/bcrypt noise in test output.
jest.mock('pino', () => {
  const noop = () => {};
  return {
    __esModule: true,
    default: Object.assign(
      () => ({ info: noop, warn: noop, error: noop, debug: noop, child: () => ({ info: noop }) }),
      { __esModule: true },
    ),
  };
});
