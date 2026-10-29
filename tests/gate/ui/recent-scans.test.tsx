// tests/gate/ui/recent-scans.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecentScans } from '@/components/operator/RecentScans';
import { TEST_SCAN } from '../helpers/fixtures';

describe('<RecentScans>', () => {
  const onSelect = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('shows an empty state when there are no scans', () => {
    render(<RecentScans scans={[]} onSelect={onSelect} />);
    expect(screen.getByText(/no gate scans registered/i)).toBeInTheDocument();
  });

  it('renders each scan with name + direction', () => {
    render(<RecentScans scans={[TEST_SCAN as any]} onSelect={onSelect} />);
    expect(screen.getByText(/ravi kumar/i)).toBeInTheDocument();
    const inMatches = screen.getAllByText(/in/i);
    expect(inMatches.length).toBeGreaterThan(0);
  });

  it('fires onSelect when a row is clicked', () => {
    render(<RecentScans scans={[TEST_SCAN as any]} onSelect={onSelect} />);
    const row = screen.getByText(/ravi kumar/i).closest('[role="button"], button, li, div');
    fireEvent.click(row!);
    expect(onSelect).toHaveBeenCalled();
  });
});
