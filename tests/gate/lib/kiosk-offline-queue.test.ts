// tests/gate/lib/kiosk-offline-queue.test.ts
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => {
    store[key] = String(val);
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const k of Object.keys(store)) delete store[k];
  },
};

(global as any).window = { localStorage: mockLocalStorage };
(global as any).localStorage = mockLocalStorage;

import {
  enqueueOfflineScan,
  getOfflineScanQueue,
  clearOfflineScanQueue,
  removeOfflineScan,
  flushOfflineScanQueue,
} from '@/lib/kiosk-offline-queue';

describe('lib/kiosk-offline-queue', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('enqueues and retrieves offline scans', () => {
    enqueueOfflineScan({
      clientEventId: 'ev-1',
      roll: '24JJ1A0501',
      direction: 'IN',
      gateId: 'G-1',
      operatorId: 'OP-1',
    });

    const queue = getOfflineScanQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].roll).toBe('24JJ1A0501');
    expect(queue[0].clientEventId).toBe('ev-1');
  });

  it('deduplicates queued scans by clientEventId', () => {
    enqueueOfflineScan({
      clientEventId: 'ev-dup',
      roll: '24JJ1A0501',
      direction: 'IN',
      gateId: 'G-1',
      operatorId: 'OP-1',
    });
    enqueueOfflineScan({
      clientEventId: 'ev-dup',
      roll: '24JJ1A0501',
      direction: 'IN',
      gateId: 'G-1',
      operatorId: 'OP-1',
    });

    expect(getOfflineScanQueue()).toHaveLength(1);
  });

  it('removes scan by clientEventId and clears queue', () => {
    enqueueOfflineScan({ clientEventId: 'ev-a', roll: '24JJ1A0501', direction: 'IN', gateId: 'G-1', operatorId: 'OP-1' });
    enqueueOfflineScan({ clientEventId: 'ev-b', roll: '24JJ1A0502', direction: 'OUT', gateId: 'G-1', operatorId: 'OP-1' });

    removeOfflineScan('ev-a');
    expect(getOfflineScanQueue()).toHaveLength(1);
    expect(getOfflineScanQueue()[0].clientEventId).toBe('ev-b');

    clearOfflineScanQueue();
    expect(getOfflineScanQueue()).toHaveLength(0);
  });

  it('flushes queued scans to /api/gate/scan and purges successful entries', async () => {
    enqueueOfflineScan({ clientEventId: 'ev-flush', roll: '24JJ1A0501', direction: 'IN', gateId: 'G-1', operatorId: 'OP-1' });

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    } as any);

    const result = await flushOfflineScanQueue();
    expect(result.flushed).toBe(1);
    expect(result.failed).toBe(0);
    expect(getOfflineScanQueue()).toHaveLength(0);
  });
});
