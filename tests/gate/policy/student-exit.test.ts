// tests/gate/policy/student-exit.test.ts
import { normalizeExitReason, requiresGatePass } from '@/lib/student-exit-flow';

describe('policy/student-exit — reason normalization', () => {
  it('normalizes every alias to canonical codes', () => {
    expect(normalizeExitReason('Regular')).toBe('regular');
    expect(normalizeExitReason('Daily Outing')).toBe('daily_outing');
    expect(normalizeExitReason('Day Pass')).toBe('day_pass');
    expect(normalizeExitReason('Home In')).toBe('home_in');
    expect(normalizeExitReason('home_out')).toBe('home_out');
    expect(normalizeExitReason('Day Scholar Out')).toBe('day_scholar_out');
    expect(normalizeExitReason('Emergency')).toBe('emergency');
    expect(normalizeExitReason('Special Leave')).toBe('home_out');
  });

  it('returns "regular" for null / unknown', () => {
    expect(normalizeExitReason(null)).toBe('regular');
    expect(normalizeExitReason(undefined)).toBe('regular');
    expect(normalizeExitReason('')).toBe('regular');
    expect(normalizeExitReason('nonsense')).toBe('regular');
  });

  it('requiresGatePass is true only for home_out, day_pass, and emergency', () => {
    expect(requiresGatePass('home_out')).toBe(true);
    expect(requiresGatePass('day_pass')).toBe(true);
    expect(requiresGatePass('emergency')).toBe(true);
    for (const r of ['daily_outing', 'home_in', 'day_scholar_out', 'regular']) {
      expect(requiresGatePass(r)).toBe(false);
    }
  });
});
