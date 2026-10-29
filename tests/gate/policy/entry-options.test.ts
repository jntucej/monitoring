// tests/gate/policy/entry-options.test.ts
import { resolveEntryOptions } from '@/lib/permission-workflow';

describe('policy/entry-options (button matrix)', () => {
  it('prior daily_outing → single "Return to Hostel" (no type choice)', () => {
    const r = resolveEntryOptions('daily_outing', 'hosteller');
    expect(r.buttons).toEqual(['return_to_hostel']);
    expect(r.allowsTypeChoice).toBe(false);
  });

  it('prior day_pass → single "Return to Hostel"', () => {
    const r = resolveEntryOptions('day_pass', 'hosteller');
    expect(r.buttons).toEqual(['return_to_hostel']);
    expect(r.allowsTypeChoice).toBe(false);
  });

  it('prior day_scholar_out → single "Outing In"', () => {
    const r = resolveEntryOptions('day_scholar_out', 'day_scholar');
    expect(r.buttons).toEqual(['day_scholar_in']);
    expect(r.allowsTypeChoice).toBe(false);
  });

  it('prior home_out → [Home In, Outing In] with type choice', () => {
    const r = resolveEntryOptions('home_out', 'hosteller');
    expect(r.buttons).toEqual(['home_in', 'day_scholar_in']);
    expect(r.allowsTypeChoice).toBe(true);
  });

  it('null (first scan) → [Home In, Outing In] with type choice', () => {
    const r = resolveEntryOptions(null, null);
    expect(r.buttons).toEqual(['home_in', 'day_scholar_in']);
    expect(r.allowsTypeChoice).toBe(true);
  });

  it('prior emergency → single "Return to Hostel"', () => {
    const r = resolveEntryOptions('emergency', 'hosteller');
    expect(r.buttons).toEqual(['return_to_hostel']);
  });
});
