// tests/gate/ui/success-flash.test.tsx
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SuccessFlash } from '@/components/operator/SuccessFlash';

jest.useFakeTimers();

describe('<SuccessFlash>', () => {
  beforeEach(() => jest.clearAllTimers());

  it('renders a success message + tap-to-reset affordance', () => {
    const onClick = jest.fn();
    render(
      <SuccessFlash onClick={onClick} direction="IN" reason="home_in">
        <span>Ravi Kumar · Home In</span>
      </SuccessFlash>,
    );
    expect(screen.getByText(/ravi kumar/i)).toBeInTheDocument();
  });

  it('fires onClick when tapped', () => {
    const onClick = jest.fn();
    render(
      <SuccessFlash onClick={onClick}><span>done</span></SuccessFlash>,
    );
    const clickable = screen.getByText('done').closest('[role="button"], button, div');
    fireEvent.click(clickable!);
    expect(onClick).toHaveBeenCalled();
  });

  it('auto-dismisses after the configured timeout', () => {
    const onClick = jest.fn();
    render(
      <SuccessFlash onClick={onClick} autoDismissMs={1500}>
        <span>done</span>
      </SuccessFlash>,
    );
    act(() => { jest.advanceTimersByTime(1600); });
    expect(onClick).toHaveBeenCalled();
  });

  it('does NOT auto-dismiss before the timeout', () => {
    const onClick = jest.fn();
    render(
      <SuccessFlash onClick={onClick} autoDismissMs={2500}>
        <span>done</span>
      </SuccessFlash>,
    );
    act(() => { jest.advanceTimersByTime(1000); });
    expect(onClick).not.toHaveBeenCalled();
  });
});
