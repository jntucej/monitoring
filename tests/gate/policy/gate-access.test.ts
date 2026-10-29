// tests/gate/policy/gate-access.test.ts
import {
  assertOperatorGateMatch,
  checkBackGateGeo,
  distanceMeters,
  operatorMustHaveGate,
  assertOperatorHasGate,
} from '@/server/policy/gate-access';
import { ForbiddenError } from '@/server/http/errors';

describe('policy/gate-access', () => {
  describe('assertOperatorGateMatch', () => {
    it('allows an operator whose assigned gate matches by ID', () => {
      expect(() =>
        assertOperatorGateMatch('operator', 'G-1', 'G-1', 'MAIN', null),
      ).not.toThrow();
    });

    it('allows match by gate_code (stale gate_id fallback)', () => {
      expect(() =>
        assertOperatorGateMatch('operator', 'MAIN', 'G-1', 'MAIN', null),
      ).not.toThrow();
    });

    it('rejects an operator scanning at a foreign gate', () => {
      expect(() =>
        assertOperatorGateMatch('operator', 'G-1', 'G-2', 'SIDE', null),
      ).toThrow(ForbiddenError);
    });

    it('allows admins / sysadmin / principal to scan any gate', () => {
      for (const r of ['admin', 'sysadmin', 'principal']) {
        expect(() => assertOperatorGateMatch(r, 'G-1', 'G-2', 'SIDE', null)).not.toThrow();
      }
    });

    it('allows an operator with supervised_gates to scan at a supervised gate', () => {
      expect(() =>
        assertOperatorGateMatch('operator', 'G-1', 'G-3', 'BACK', ['G-3', 'G-4']),
      ).not.toThrow();
    });

    it('rejects an operator scanning a gate not in supervised_gates', () => {
      expect(() =>
        assertOperatorGateMatch('operator', 'G-1', 'G-3', 'BACK', ['G-4']),
      ).toThrow(ForbiddenError);
    });

    it('allows an unassigned operator at the default gate (main)', () => {
      expect(() =>
        assertOperatorGateMatch('operator', null, '5f2183c9-51ae-4677-8f38-52a17bbe0538', 'main', null),
      ).not.toThrow();
    });
  });

  describe('operatorMustHaveGate', () => {
    it('returns true for operator', () => expect(operatorMustHaveGate('operator')).toBe(true));
    it('returns false for sysadmin', () => expect(operatorMustHaveGate('sysadmin')).toBe(false));
  });

  describe('assertOperatorHasGate', () => {
    it('does not throw for a non-operator role', async () => {
      await expect(assertOperatorHasGate('admin', null)).resolves.toBeUndefined();
    });

    it('resolves for an operator bound to a gate', async () => {
      await expect(assertOperatorHasGate('operator', 'G-1')).resolves.toBeUndefined();
    });
  });

  describe('distanceMeters + back-gate geo', () => {
    it('computes ~111 km per degree of latitude', () => {
      const d = distanceMeters(0, 0, 1, 0);
      expect(d).toBeGreaterThan(110_000);
      expect(d).toBeLessThan(112_000);
    });

    it('returns ok when gate has no radius configured (defaults to 200m radius)', () => {
      const r = checkBackGateGeo({ gate_code: 'BACK', latitude: 18.0, longitude: 78.0, allowed_radius_meters: null }, { latitude: 18.0001, longitude: 78.0001 });
      expect(r.ok).toBe(true);
    });

    it('rejects when point is outside the configured radius', () => {
      const r = checkBackGateGeo(
        { gate_code: 'BACK', latitude: 18.0, longitude: 78.0, allowed_radius_meters: 100 },
        { latitude: 18.1, longitude: 78.0 }, // ~11 km away
      );
      expect(r.ok).toBe(false);
      expect(r.reason).toBe('too_far');
    });

    it('allows when point is inside radius', () => {
      const r = checkBackGateGeo(
        { gate_code: 'BACK', latitude: 18.0, longitude: 78.0, allowed_radius_meters: 500 },
        { latitude: 18.0001, longitude: 78.0001 }, // ~14 m
      );
      expect(r.ok).toBe(true);
    });

    it('ignores geo for non-back gates', () => {
      const r = checkBackGateGeo(
        { gate_code: 'MAIN', latitude: 0, longitude: 0, allowed_radius_meters: 100 },
        { latitude: 10, longitude: 10 },
      );
      expect(r.ok).toBe(true);
    });
  });
});
