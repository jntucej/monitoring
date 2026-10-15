// localStorage-backed queue of gate scans captured while offline (spec §9).
// Client-side only — import from "use client" modules only.

export interface QueuedScan {
  clientEventId: string;
  roll: string;
  direction: "IN" | "OUT";
  reason?: string;
  gateId: string;
  queuedAt: number;
  status: "queued" | "replaying";
}

const QUEUE_KEY = "operator_scan_queue_v1";

function readQueue(): QueuedScan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as QueuedScan[];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedScan[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // storage full / unavailable — drop silently, queue is best-effort
  }
}

/** Append a scan to the queue. No-op if the clientEventId is already present. */
export function addScan(item: QueuedScan): void {
  if (typeof window === "undefined") return;
  const items = readQueue();
  if (items.some((s) => s.clientEventId === item.clientEventId)) return;
  items.push(item);
  writeQueue(items);
}

/** Return queued scans in insertion order. */
export function pendingScans(): QueuedScan[] {
  return readQueue();
}

/** Remove a scan from the queue by its clientEventId. */
export function removeScan(clientEventId: string): void {
  const items = readQueue();
  writeQueue(items.filter((s) => s.clientEventId !== clientEventId));
}

/** Mark scans as in-flight for a replay batch. */
export function markReplaying(ids: string[]): void {
  const items = readQueue();
  const set = new Set(ids);
  writeQueue(
    items.map((s) => (set.has(s.clientEventId) ? { ...s, status: "replaying" as const } : s))
  );
}

/** Remove all queued scans. */
export function clearAll(): void {
  writeQueue([]);
}

export function isQueueNonEmpty(): boolean {
  return readQueue().length > 0;
}
