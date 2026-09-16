import { RawDeviceLog } from './types';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

/**
 * Log fetch boundary.
 *
 * Today this project has two realistic ingestion modes for the H0201:
 *
 *   1. TCP 4370 pull from a network-enabled terminal.
 *   2. USB file drop (ATTLOG.DAT / exported text) copied to the host running this worker.
 *
 * The real proprietary ZK-derivative socket protocol is not assumed to be
 * solved here. The TCP path is an explicit adapter boundary with a safe mock
 * fallback so the mapper and dual-write sink can be tested without a device.
 */

export type LogFetchMode = 'tcp' | 'usb_text_file' | 'usb_binary_file' | 'mock';

export interface LogFetcherConfig {
  mode: LogFetchMode;
  /** TCP only */
  host?: string;
  port?: number;
  timeoutMs?: number;
  /** USB file drop only */
  filePath?: string;
}

export interface LogFetcher {
  fetch(): Promise<RawDeviceLog[]>;
}

/**
 * Text export parser for UTF-8 CSV-like or delimited H0201 exports.
 */
export function parseTextExport(raw: string): RawDeviceLog[] {
  const lines = raw.split(/\r?\n/);
  const logs: RawDeviceLog[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      const parsed = parseTextLine(line);
      if (parsed) logs.push(parsed);
    } catch (err) {
      console.warn(`[log-fetcher] skipping unparseable text line ${i + 1}: ${err}`);
    }
  }

  return logs;
}

function parseTextLine(line: string): RawDeviceLog | null {
  const parts = line.split(/[,\t|]+/);
  if (parts.length < 2) return null;

  const deviceUserId = parts[0].trim();
  const localTimestamp = parts[1].trim();
  const verifyMode = parts[2]?.trim() || undefined;
  const state = parts[3] ? Number(parts[3].trim()) : undefined;

  if (!deviceUserId || !localTimestamp) return null;

  return { deviceUserId, localTimestamp, verifyMode, state };
}

/**
 * Best-effort reader for a binary ATTLOG-style file.
 */
export async function parseBinaryExport(filePath: string, blockSize = 40): Promise<RawDeviceLog[]> {
  const buffer = await readFile(filePath);
  const logs: RawDeviceLog[] = [];

  if (buffer.length === 0) return logs;

  const fullBlocks = Math.floor(buffer.length / blockSize);
  for (let i = 0; i < fullBlocks; i++) {
    try {
      const block = buffer.subarray(i * blockSize, (i + 1) * blockSize);
      const parsed = parseBinaryBlock(block, i);
      if (parsed) logs.push(parsed);
    } catch (err) {
      console.warn(`[log-fetcher] skipping malformed binary block ${i + 1}: ${err}`);
    }
  }

  if (buffer.length % blockSize !== 0) {
    console.warn(`[log-fetcher] trailing bytes (${buffer.length % blockSize}) ignored on ${filePath}`);
  }

  return logs;
}

function parseBinaryBlock(block: Buffer, index: number): RawDeviceLog | null {
  if (block.length < 20) return null;

  const deviceUserId = decodeFixedText(block, 0, 8);
  const localTimestamp = decodeFixedText(block, 8, 12);
  const state = block.length >= 24 ? block.readUInt32LE(20) : undefined;

  if (!deviceUserId && !localTimestamp) return null;

  return {
    deviceUserId,
    localTimestamp,
    state,
    meta: { blockIndex: index, rawHex: block.toString('hex').slice(0, 32) },
  };
}

function decodeFixedText(block: Buffer, start: number, length: number): string {
  const end = Math.min(start + length, block.length);
  return block.subarray(start, end).toString('utf8').replace(/\0/g, '').trim();
}
/**
 * TCP 4370 adapter.
 *
 * This is the one place that must be replaced with a confirmed protocol
 * implementation if the target H0201 unit actually exposes a predictable
 * ZK-derivative command/response stream.
 *
 * For now it returns a safe mock so the worker can be validated end to end.
 */
export function createTcpLogFetcher(opts: {
  host: string;
  port: number;
  timeoutMs?: number;
}): LogFetcher {
  return {
    async fetch() {
      if (process.env.USE_FAKE_DEVICE_LOGS === 'true') {
        return fakeTcpLogs();
      }

      // TODO: replace with the real protocol implementation.
      throw new Error(
        '[log-fetcher] TCP 4370 fetch not implemented yet. Set USE_FAKE_DEVICE_LOGS=true for dev, or implement the device protocol in this boundary.'
      );
    },
  };
}

/**
 * Fake logs for local development / CI without a physical terminal.
 */
function fakeTcpLogs(): RawDeviceLog[] {
  const base = new Date(Date.now() - 60_000);

  return [
    {
      deviceUserId: '101',
      localTimestamp: isoNoTz(base),
      verifyMode: 'fp',
      state: 0,
    },
    {
      deviceUserId: '102',
      localTimestamp: isoNoTz(new Date(base.getTime() + 20_000)),
      verifyMode: 'fp',
      state: 1,
    },
  ];
}

function isoNoTz(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

/**
 * File-based fetcher for USB text exports.
 */
export async function createTextFileLogFetcher(filePath: string): Promise<LogFetcher> {
  let cached = false;
  let cachedLogs: RawDeviceLog[] | null = null;

  return {
    async fetch() {
      if (cached && cachedLogs !== null) return cachedLogs;

      const absolutePath = resolve(filePath);
      const raw = await readFile(absolutePath, 'utf8');
      cachedLogs = parseTextExport(raw);
      cached = true;
      return cachedLogs;
    },
  };
}

/**
 * File-based fetcher for USB binary exports.
 */
export async function createBinaryFileLogFetcher(
  filePath: string,
  blockSize = 40
): Promise<LogFetcher> {
  let cached = false;
  let cachedLogs: RawDeviceLog[] | null = null;

  return {
    async fetch() {
      if (cached && cachedLogs !== null) return cachedLogs;

      const absolutePath = resolve(filePath);
      cachedLogs = await parseBinaryExport(absolutePath, blockSize);
      cached = true;
      return cachedLogs;
    },
  };
}

