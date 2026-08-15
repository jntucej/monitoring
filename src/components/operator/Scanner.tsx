"use client";
import { QrCode } from "lucide-react";
import { useState } from "react";
import { QRCode } from "react-qrcode-logo";

export function Scanner() {
  const [scannedData, setScannedData] = useState<string | null>(null);

  const handleScan = (data: string | null) => {
    if (data) {
      setScannedData(data);
    }
  };

  const handleError = (err: any) => {
    console.error(err);
  };

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 flex flex-col items-center">
      <div className="w-64 h-64 bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        {/* Placeholder for QR Code Scanner */}
        <QrCode className="w-24 h-24 text-gray-400 dark:text-gray-600" />
      </div>
      <p className="mt-4 text-sm text-[var(--text-muted)]">
        {scannedData ? `Last scan: ${scannedData}` : "Align QR code within frame to scan"}
      </p>
    </div>
  );
}
