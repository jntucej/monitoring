// tests/gate/policy/operator-gate-scope.test.ts
import { resolveOperatorGateScope } from '@/server/policy/gate-scope';
import { ForbiddenError } from '@/server/http/errors';

describe('policy/gate-scope', () => {
  it('returns operator.gateId for an operator', () => {
    expect(resolveOperatorGateScope({ role: 'operator', gateId: 'G-1' })).toBe('G-1');
  });

  it('returns null for an unassigned operator (falls through to all-gate)', () => {
    expect(resolveOperatorGateScope({ role: 'operator', gateId: null })).toBeNull();
  });

  it('honours a supervised-gates hint for supervisor', () => {
    expect(
      resolveOperatorGateScope(
        { role: 'supervisor', gateId: 'G-1', supervisedGates: ['G-2', 'G-3'] },
        'G-3',
      ),
    ).toBe('G-3');
  });

  it('rejects a hint outside supervised_gates for supervisor', () => {
    expect(() =>
      resolveOperatorGateScope(
        { role: 'supervisor', gateId: 'G-1', supervisedGates: ['G-2'] },
        'G-9',
      ),
    ).toThrow(ForbiddenError);
  });

  it('admin with no gateId → null (all-gates scope)', () => {
    expect(resolveOperatorGateScope({ role: 'admin', gateId: null })).toBeNull();
  });
});
