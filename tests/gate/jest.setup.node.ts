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

// Jest's node test environment sandboxes `global` and does NOT expose the modern
// web-fetch globals (Request / Response / Headers / FormData), even though the
// underlying Node runtime (v18+) has them. The gate helpers
// (tests/gate/helpers/next-server.ts) extend `Request`, so the class must be a
// real global for the suite to load. Polyfill them from Node's undici (the same
// implementation Node's own fetch uses), only if missing — never clobber a real
// one. This is a test-environment shim, not a production code change.
import {
  Request as NodeRequest,
  Response as NodeResponse,
  Headers as NodeHeaders,
  FormData as NodeFormData,
} from 'undici';

const g = globalThis as Record<string, unknown>;
if (typeof g.Request !== 'function') g.Request = NodeRequest;
if (typeof g.Response !== 'function') g.Response = NodeResponse;
if (typeof g.Headers !== 'function') g.Headers = NodeHeaders;
if (typeof g.FormData !== 'function') g.FormData = NodeFormData;

jest.mock('pino', () => ({
  __esModule: true,
  default: Object.assign(
    () => ({ info(){}, warn(){}, error(){}, debug(){}, child: () => ({ info(){} }) }),
    { __esModule: true },
  ),
}));
