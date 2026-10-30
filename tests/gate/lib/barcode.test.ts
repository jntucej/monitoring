// tests/gate/lib/barcode.test.ts
import { normalizeScannedPayload, isJwtOrToken, isRecognizedIdentifier } from '@/lib/barcode';

describe('lib/barcode — normalizeScannedPayload', () => {
  it('preserves case for security tokens (JWTs and signed pass tokens)', () => {
    const fakeJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotUppercaseMe';
    expect(isJwtOrToken(fakeJwt)).toBe(true);
    expect(normalizeScannedPayload(fakeJwt)).toBe(fakeJwt);

    const fakePassToken = 'mycampus:pass:eyJhbGciOiJIUzI1NiJ9.sig';
    expect(isJwtOrToken(fakePassToken)).toBe(true);
    expect(normalizeScannedPayload(fakePassToken)).toBe(fakePassToken);
    expect(isRecognizedIdentifier(fakeJwt)).toBe(true);
  });
  it('extracts roll from JSON payloads', () => {
    expect(normalizeScannedPayload('{"roll":"24JJ1A0501"}')).toBe('24JJ1A0501');
    expect(normalizeScannedPayload('{"student_roll":"24JJ1A0501"}')).toBe('24JJ1A0501');
    expect(normalizeScannedPayload('{"uniqueId":"EMP-001"}')).toBe('EMP-001');
  });

  it('extracts roll from a URL', () => {
    expect(normalizeScannedPayload('https://campus.edu/id/24JJ1A0501')).toBe('24JJ1A0501');
    expect(normalizeScannedPayload('http://x/y/24JJ1A0501')).toBe('24JJ1A0501');
  });

  it('handles key=value strings', () => {
    expect(normalizeScannedPayload('id=24JJ1A0501')).toBe('24JJ1A0501');
    expect(normalizeScannedPayload('roll:24JJ1A0501')).toBe('24JJ1A0501');
  });

  it('passes plain barcode text through, uppercased', () => {
    expect(normalizeScannedPayload('24jj1a0501')).toBe('24JJ1A0501');
    expect(normalizeScannedPayload('  emp-001  ')).toBe('EMP-001');
  });
});
