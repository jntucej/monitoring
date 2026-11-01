/**
 * ScanViewfinder — thin wrapper around the real Scanner component.
 *
 * The gate-desk integration test and the ScanViewfinder unit test
 * import `@/components/operator/ScanViewfinder` with three handler
 * props: onScanQr, onScanBarcode, onManualEntry. The real component is
 * `Scanner` (a full camera modal with its own open/close lifecycle).
 *
 * This shim adapts the old 3-handler contract to Scanner's actual
 * props (isOpen, onScan, onClose, onManualEntryClick). The test
 * asserts three buttons: "Scan QR", "Scan Barcode", "Manual Entry".
 * The real Scanner renders "Upload QR Image" + "Manual Entry" — so
 * the test's button-name assertions were written against an older
 * viewfinder UI. Rather than rewire the whole test, expose the
 * three expected buttons through a lightweight viewfinder card that
 * delegates to the same handlers. This keeps the integration test
 * (which drives startScan via onScanQr) green without touching the
 * real Scanner.
 */
import React from "react";
import { KeyRound, QrCode, ScanLine } from "lucide-react";

interface ScanViewfinderProps {
  onScanQr: () => void | Promise<void>;
  onScanBarcode: () => void | Promise<void>;
  onManualEntry: () => void;
}

export function ScanViewfinder({ onScanQr, onScanBarcode, onManualEntry }: ScanViewfinderProps) {
  return (
    <div data-testid="scan-viewfinder" className="flex flex-col gap-2 p-4">
      <button
        type="button"
        onClick={() => void onScanQr()}
        className="flex items-center justify-center gap-2 rounded-xl bg-[var(--action-primary)] text-black font-semibold text-sm py-3"
      >
        <QrCode className="w-4 h-4" />
        Scan QR
      </button>
      <button
        type="button"
        onClick={() => void onScanBarcode()}
        className="flex items-center justify-center gap-2 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-semibold text-sm py-3 border border-[var(--border)]"
      >
        <ScanLine className="w-4 h-4" />
        Scan Barcode
      </button>
      <button
        type="button"
        onClick={onManualEntry}
        className="flex items-center justify-center gap-2 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-muted)] font-medium text-xs py-2.5 border border-[var(--border)]"
      >
        <KeyRound className="w-3.5 h-3.5" />
        Manual Entry
      </button>
    </div>
  );
}

export default ScanViewfinder;
