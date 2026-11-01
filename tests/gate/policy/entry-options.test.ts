// tests/gate/policy/entry-options.test.ts
import { resolveEntryOptions } from '@/lib/permission-workflow';

describe('policy/entry-options (button matrix)', () => {
  it('prior daily_outing + hosteller → single "Home In" (type pinned, no choice)', () => {
    const r = resolveEntryOptions('daily_outing', 'hosteller');
    expect(r.buttons).toEqual(['home_in']);
    expect(r.allowsTypeChoice).toBe(false);
  });

  it('prior day_pass + hosteller → single "Home In"', () => {
    const r = resolveEntryOptions('day_pass', 'hosteller');
    expect(r.buttons).toEqual(['home_in']);
    expect(r.allowsTypeChoice).toBe(false);
  });

  it('prior daily_outing + unknown type → single "Return to Hostel"', () => {
    // Type not yet stored at the gate (never transitioned): fall back to the
    // hostel-reason pin so the operator returns the student to their room.
    const r = resolveEntryOptions('daily_outing', null);
    expect(r.buttons).toEqual(['return_to_hostel']);
    expect(r.allowsTypeChoice).toBe(false);
  });

  it('prior day_scholar_out → single "Outing In"', () => {
    const r = resolveEntryOptions('day_scholar_out', 'day_scholar');
    expect(r.buttons).toEqual(['day_scholar_in']);
    expect(r.allowsTypeChoice).toBe(false);
  });

  it('prior home_out + hosteller → single "Home In" (type pinned)', () => {
    const r = resolveEntryOptions('home_out', 'hosteller');
    expect(r.buttons).toEqual(['home_in']);
    expect(r.allowsTypeChoice).toBe(false);
  });

  it('prior home_out + unknown type → [Home In, Day Scholar In] with type choice', () => {
    const r = resolveEntryOptions('home_out', null);
    expect(r.buttons).toEqual(['home_in', 'day_scholar_in']);
    expect(r.allowsTypeChoice).toBe(true);
  });

  it('null (first scan) → [Home In, Day Scholar In] with type choice', () => {
    const r = resolveEntryOptions(null, null);
    expect(r.buttons).toEqual(['home_in', 'day_scholar_in']);
    expect(r.allowsTypeChoice).toBe(true);
  });

  it('prior emergency + hosteller → single "Home In" (type pinned)', () => {
    const r = resolveEntryOptions('emergency', 'hosteller');
    expect(r.buttons).toEqual(['home_in']);
  });

  it('prior emergency + unknown type → single "Return to Hostel"', () => {
    const r = resolveEntryOptions('emergency', null);
    expect(r.buttons).toEqual(['return_to_hostel']);
  });
});
