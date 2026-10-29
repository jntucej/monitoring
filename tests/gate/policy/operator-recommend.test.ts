// tests/gate/policy/operator-recommend.test.ts
import { recommend } from '@/lib/operator-recommend';

describe('policy/operator-recommend', () => {
  const base = {
    campusStatus: 'OUT' as const,
    lastReason: null,
    currentEntryType: 'hosteller' as const,
    hasApprovedPass: false,
    curfewMinutes: null,
    biometricReady: false,
  };

  it('OUT + daily_outing → recommend "Return to Hostel" (IN)', () => {
    const r = recommend({ ...base, lastReason: 'daily_outing' });
    expect(r.direction).toBe('IN');
    expect(r.entryButton).toBe('return_to_hostel');
    expect(r.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('OUT + home_out → recommend "Home In"', () => {
    const r = recommend({ ...base, lastReason: 'home_out' });
    expect(r.direction).toBe('IN');
    expect(r.entryButton).toBe('home_in');
  });

  it('IN + hosteller → recommend Daily Outing (OUT)', () => {
    const r = recommend({ ...base, campusStatus: 'IN', lastReason: null });
    expect(r.direction).toBe('OUT');
    expect(r.reason).toBe('daily_outing');
  });

  it('IN + day_scholar → recommend Day Scholar Out', () => {
    const r = recommend({
      ...base,
      campusStatus: 'IN',
      currentEntryType: 'day_scholar',
    });
    expect(r.direction).toBe('OUT');
    expect(r.reason).toBe('day_scholar_out');
  });

  it('always returns at most 2 alternatives', () => {
    for (const status of ['IN', 'OUT', null] as const) {
      for (const curfew of [null, 5, 30]) {
        const r = recommend({ ...base, campusStatus: status, curfewMinutes: curfew });
        expect(r.alternatives.length).toBeLessThanOrEqual(2);
      }
    }
  });

  it('adds curfew caution alternative when curfew is imminent', () => {
    const r = recommend({ ...base, campusStatus: 'OUT', curfewMinutes: 5 });
    const curfewAlt = r.alternatives.find((a) => a.code === 'curfew');
    expect(curfewAlt).toBeDefined();
    expect(curfewAlt?.label).toContain('Curfew');
  });
});
