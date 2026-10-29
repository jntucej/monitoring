// tests/gate/lib/qr-token.test.ts
import { generateQrToken, validateQrToken } from '@/lib/qr-token';

jest.mock('@/lib/postgres', () => {
  // In-memory replay tracking
  const seen = new Set<string>();
  return {
    query: jest.fn(async (sql: string, params: any[]) => {
      if (typeof sql === 'string' && /INSERT/i.test(sql)) {
        const jti = params?.[params.length - 1] ?? params?.[0];
        if (seen.has(String(jti))) return { rows: [], rowCount: 0 };
        seen.add(String(jti));
        return { rows: [{ jti }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    }),
    __resetReplay: () => seen.clear(),
  };
});

describe('lib/qr-token', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@/lib/postgres').__resetReplay?.();
  });

  it('issues a token that verifies once', async () => {
    const t = await generateQrToken('24JJ1A0501', 'USER-UUID', 60);
    const claims = await validateQrToken(t);
    expect(claims).not.toBeNull();
    expect(claims!.roll).toBe('24JJ1A0501');
    expect(claims!.purpose).toBe('qr_verification');
  });

  it('replays are rejected', async () => {
    const t = await generateQrToken('24JJ1A0501', 'USER-UUID', 60);
    await validateQrToken(t);
    const second = await validateQrToken(t);
    expect(second).toBeNull();
  });

  it('rejects a tampered token', async () => {
    const t = await generateQrToken('24JJ1A0501', 'USER-UUID', 60);
    const parts = t.split('.');
    parts[1] = parts[1].slice(0, -2) + 'xx'; // corrupt signature
    expect(await validateQrToken(parts.join('.'))).toBeNull();
  });

  it('expired tokens are rejected', async () => {
    const t = await generateQrToken('24JJ1A0501', 'USER-UUID', -10); // already expired
    expect(await validateQrToken(t)).toBeNull();
  });
});
