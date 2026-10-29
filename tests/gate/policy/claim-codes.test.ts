// tests/gate/policy/claim-codes.test.ts
import {
  normalizeClaimCode,
  formatClaimCode,
  generateClaimCode,
  hashClaimCode,
  mintClaimCode,
} from '@/lib/claim-codes';

describe('policy/claim-codes', () => {
  it('normalizes "123 456" and "12-34-56" to "123456"', () => {
    expect(normalizeClaimCode('123 456')).toBe('123456');
    expect(normalizeClaimCode('12-34-56')).toBe('123456');
    expect(normalizeClaimCode('123456')).toBe('123456');
  });

  it('keeps only digits on non-numeric characters', () => {
    expect(normalizeClaimCode('12345')).toBe('12345');
    expect(normalizeClaimCode('abcdef')).toBe('');
    expect(normalizeClaimCode('')).toBe('');
  });

  it('formats a 6-digit code with a space', () => {
    expect(formatClaimCode('123456')).toBe('123456');
  });

  it('generateClaimCode produces a 6-digit string', () => {
    for (let i = 0; i < 50; i++) {
      const c = generateClaimCode();
      expect(c).toMatch(/^\d{6}$/);
    }
  });

  it('hash is deterministic and hides the plaintext', () => {
    const h1 = hashClaimCode('482913');
    const h2 = hashClaimCode('482913');
    expect(h1).toBe(h2);
    expect(h1).not.toContain('482913');
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('different codes hash differently', () => {
    expect(hashClaimCode('111111')).not.toBe(hashClaimCode('111112'));
  });

  it('mintClaimCode returns plaintext + hash + expiresAt in the future', () => {
    const m = mintClaimCode(60);
    expect(m.plaintext).toMatch(/^\d{6}$/);
    expect(m.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(new Date(m.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});
