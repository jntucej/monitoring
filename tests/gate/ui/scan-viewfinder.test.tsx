// tests/gate/ui/scan-viewfinder.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/context/GlassContext', () => ({
  useGlass: () => ({
    isLiveStream: true, wsConnected: true, isDark: false,
  }),
}));

import { ScanViewfinder } from '@/components/operator/ScanViewfinder';

describe('<ScanViewfinder>', () => {
  const handlers = {
    onScanQr: jest.fn(),
    onScanBarcode: jest.fn(),
    onManualEntry: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders both scanner buttons + manual entry', () => {
    render(<ScanViewfinder {...handlers} />);
    expect(screen.getByRole('button', { name: /scan qr/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /scan barcode/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manual entry/i })).toBeInTheDocument();
  });

  it('fires onScanQr when the QR button is clicked', () => {
    render(<ScanViewfinder {...handlers} />);
    fireEvent.click(screen.getByRole('button', { name: /scan qr/i }));
    expect(handlers.onScanQr).toHaveBeenCalledTimes(1);
    expect(handlers.onScanBarcode).not.toHaveBeenCalled();
  });

  it('fires onScanBarcode when the barcode button is clicked', () => {
    render(<ScanViewfinder {...handlers} />);
    fireEvent.click(screen.getByRole('button', { name: /scan barcode/i }));
    expect(handlers.onScanBarcode).toHaveBeenCalledTimes(1);
  });

  it('fires onManualEntry when manual entry is clicked', () => {
    render(<ScanViewfinder {...handlers} />);
    fireEvent.click(screen.getByRole('button', { name: /manual entry/i }));
    expect(handlers.onManualEntry).toHaveBeenCalledTimes(1);
  });

  it('does not offer a generic "Open Camera" button', () => {
    render(<ScanViewfinder {...handlers} />);
    expect(screen.queryByRole('button', { name: /open camera/i })).not.toBeInTheDocument();
  });
});
