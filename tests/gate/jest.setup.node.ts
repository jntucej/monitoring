// tests/gate/jest.setup.node.ts
process.env.NODE_ENV = 'test';
process.env.AUTH_JWT_SECRET          = 'jest-auth-jwt-secret-aaaaaaaaaaaaaaaaaaaa';
process.env.AUTH_JWT_SECRETS         = 'k1:jest-auth-jwt-secret-aaaaaaaaaaaaaaaaaaaa';
process.env.QR_TOKEN_SECRET          = 'jest-qr-token-secret-bbbbbbbbbbbbbbbbbbb';
process.env.MOBILE_TOKEN_SECRET      = 'jest-mobile-token-secret-ccccccccccccccc';
process.env.INTERNAL_MW_SECRET       = 'jest-internal-mw-secret-dddddddddddddddddd';
process.env.METRICS_SCRAPE_TOKEN     = 'jest-metrics-token';
process.env.CRON_SECRET              = 'jest-cron-secret';
process.env.KIOSK_SESSION_REQUIRE_PIN = 'true';

jest.mock('pino', () => ({
  __esModule: true,
  default: Object.assign(
    () => ({ info(){}, warn(){}, error(){}, debug(){}, child: () => ({ info(){} }) }),
    { __esModule: true },
  ),
}));
