// tests/gate/policy/lockdown.test.ts
import { assertNotLockedOut } from '@/server/policy/lockdown';
import { LockedError } from '@/server/http/errors';

describe('policy/lockdown', () => {
  const active = (scopes: string[]) => ({ id: 'L-1', scopes, message: 'Evacuate' });

  it('no lockdown → scan proceeds', () => {
    expect(() => assertNotLockedOut(null, 'G-1')).not.toThrow();
  });

  it('empty scopes → all gates blocked', () => {
    expect(() => assertNotLockedOut(active([]), 'G-1')).toThrow(LockedError);
  });

  it('scope "all" → every gate blocked', () => {
    expect(() => assertNotLockedOut(active(['all']), 'ANY')).toThrow(LockedError);
  });

  it('scoped lockdown → only matching gates blocked', () => {
    expect(() => assertNotLockedOut(active(['G-1']), 'G-1')).toThrow(LockedError);
    expect(() => assertNotLockedOut(active(['G-1']), 'G-2')).not.toThrow();
  });

  it('throws a LOCKED code (client-safe)', () => {
    try { assertNotLockedOut(active([]), 'G-1'); } catch (e) {
      expect((e as LockedError).code).toBe('LOCKED');
      expect((e as LockedError).status).toBe(423);
    }
  });
});
