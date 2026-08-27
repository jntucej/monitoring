/**
 * Offline Scan Queue & Deduplication Engine
 */

export interface QueuedScan {
  clientEventId: string;
  gateId: string;
  qrPayload: string;
  scanType: "qr" | "manual" | "nfc" | "rfid";
  timestamp: string;
  direction?: "entry" | "exit";
}

const STORAGE_KEY = "gate_monitor_offline_scans_v1";

export function getOfflineQueue(): QueuedScan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineScan(scan: Omit<QueuedScan, "clientEventId" | "timestamp">): QueuedScan {
  const queue = getOfflineQueue();
  const newScan: QueuedScan = {
    ...scan,
    clientEventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  queue.push(newScan);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  return newScan;
}

export function clearOfflineQueue(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
