/**
 * Scenario 2: Gate Kiosk Offline Resilience Queue
 *
 * When campus WAN drops or network latency spikes during peak morning rush,
 * scans are preserved in IndexedDB / localStorage queue and automatically
 * re-flushed when connection recovers, preventing student queue halts.
 */

export interface QueuedScan {
  id: string;
  payload: {
    clientEventId: string;
    roll: string;
    direction: "IN" | "OUT";
    reason?: string;
    entryType?: string;
    gateId: string;
    operatorId: string;
    timestamp: string;
  };
  queuedAt: number;
  retryCount: number;
}

const QUEUE_STORAGE_KEY = "gate_monitor_offline_scans";

export function getOfflineScanQueue(): QueuedScan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineScan(scan: QueuedScan["payload"]): void {
  if (typeof window === "undefined") return;
  try {
    const queue = getOfflineScanQueue();
    queue.push({
      id: scan.clientEventId,
      payload: scan,
      queuedAt: Date.now(),
      retryCount: 0,
    });
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue.slice(-200))); // Max 200 scans buffered
  } catch (err) {
    console.error("[offlineQueue] Failed to enqueue scan:", err);
  }
}

export async function flushOfflineScanQueue(
  sendScanFn: (scan: QueuedScan["payload"]) => Promise<boolean>
): Promise<{ flushed: number; remaining: number }> {
  if (typeof window === "undefined") return { flushed: 0, remaining: 0 };
  const queue = getOfflineScanQueue();
  if (queue.length === 0) return { flushed: 0, remaining: 0 };

  const remaining: QueuedScan[] = [];
  let flushedCount = 0;

  for (const item of queue) {
    try {
      const ok = await sendScanFn(item.payload);
      if (ok) {
        flushedCount++;
      } else {
        item.retryCount += 1;
        remaining.push(item);
      }
    } catch {
      item.retryCount += 1;
      remaining.push(item);
    }
  }

  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remaining));
  } catch {}

  return { flushed: flushedCount, remaining: remaining.length };
}
