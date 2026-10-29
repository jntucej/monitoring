// tests/gate/ui/operator-stats.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/context/GlassContext', () => ({
  useGlass: () => ({
    prefersReducedMotion: true,
    performanceTier: 'high',
    isTouchDevice: false,
    isLiveLoading: false,
  }),
}));

import { OperatorStats } from '@/components/operator/OperatorStats';

describe('<OperatorStats>', () => {
  it('renders entries / exits / on-campus numbers', () => {
    render(<OperatorStats entries={42} exits={39} onCampus={3} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('39')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders zeroes cleanly (no NaN)', () => {
    render(<OperatorStats entries={0} exits={0} onCampus={0} />);
    expect(screen.queryByText('NaN')).not.toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3);
  });
});
