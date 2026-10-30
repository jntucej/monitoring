// src/lib/kiosk-offline-queue.ts
/**
 * Offline scan queue for gate kiosks.
 * Preserves scans locally when network connectivity drops during morning/evening rushes,
 * and automatically flushes them in order when connection is restored.
 */

export interface QueuedScan {
  clientEventId: string;
  roll: string;
  direction: "IN" | "OUT";
  reason?: string;
  entryType?: "hosteller" | "day_scholar";
  gateId: string;
  operatorId: string;
  timestamp: number;
  sysTag?: any;
  geo?: any;
  retryCount: number;
}

const STORAGE_KEY = "gate_kiosk_offline_scans_v1";

export function getOfflineScanQueue(): QueuedScan[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineScan(
  scan: Omit<QueuedScan, "retryCount" | "timestamp"> & {
    retryCount?: number;
    timestamp?: number;
  }
): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const queue = getOfflineScanQueue();
    const item: QueuedScan = {
      ...scan,
      timestamp: scan.timestamp ?? Date.now(),
      retryCount: scan.retryCount ?? 0,
    };
    // Dedup by clientEventId
    const exists = queue.some((q) => q.clientEventId === item.clientEventId);
    if (!exists) {
      queue.push(item);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    }
  } catch (err) {
    console.error("Failed to enqueue offline scan:", err);
  }
}

export function clearOfflineScanQueue(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function removeOfflineScan(clientEventId: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const queue = getOfflineScanQueue().filter((q) => q.clientEventId !== clientEventId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {}
}

export async function flushOfflineScanQueue(
  headersGetter?: () => Record<string, string>
): Promise<{ flushed: number; failed: number }> {
  if (typeof window === "undefined" || !window.localStorage) return { flushed: 0, failed: 0 };
  const queue = getOfflineScanQueue();
  if (queue.length === 0) return { flushed: 0, failed: 0 };

  let flushed = 0;
  let failed = 0;
  const remaining: QueuedScan[] = [];

  const headers = headersGetter ? headersGetter() : { "Content-Type": "application/json" };

  for (const item of queue) {
    try {
      const res = await fetch("/api/gate/scan", {
        method: "POST",
        headers,
        body: JSON.stringify({
          clientEventId: item.clientEventId,
          roll: item.roll,
          direction: item.direction,
          reason: item.reason,
          entryType: item.entryType,
          gateId: item.gateId,
          operatorId: item.operatorId,
          isManual: false,
          sysTag: item.sysTag,
          geo: item.geo,
        }),
      });

      // 200/201 (success) or 409 (already recorded/duplicate) mean it's safely processed
      if (res.ok || res.status === 409) {
        flushed++;
      } else if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
        // Deterministic client errors (e.g. invalid roll, inactive gate) should be dropped or logged
        failed++;
      } else {
        // 5xx, 408, 429, or network failure: keep for next retry
        item.retryCount += 1;
        remaining.push(item);
        failed++;
      }
    } catch {
      item.retryCount += 1;
      remaining.push(item);
      failed++;
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  } catch {}

  return { flushed, failed };
}
