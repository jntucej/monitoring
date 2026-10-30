import { promises as fs } from "fs";
import { join, dirname } from "path";
import { constants as fsConstants } from "fs";
import { createHash, randomUUID } from "crypto";
import { tmpdir } from "os";

import { isS3Configured, s3PutObject, s3GetObject, s3ObjectExists } from "@/lib/s3-storage";

export type StorageKind = "volume" | "tmp" | "s3";

const VOLUME_PATH = process.env.COMPLAINTS_STORAGE_PATH ?? "/app/data/complaints";
const TMP_PATH = join(tmpdir(), "complaints");
const TMPFS_LIMIT_BYTES = 128 * 1024 * 1024;
const MAX_BYTES = 50 * 1024 * 1024;
const RESOLVE_TTL_MS = 60_000;

interface Resolved {
  baseDir: string;
  kind: StorageKind;
  freeBytes: number;
}

let _resolved: Resolved | null = null;
let _resolvedAt = 0;

async function tryDir(p: string): Promise<boolean> {
  try {
    await fs.mkdir(p, { recursive: true });
    await fs.access(p, fsConstants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function freeBytes(p: string): Promise<number> {
  try {
    const { statfs } = await import("fs/promises");
    const s = await statfs(p);
    return Number(s.bavail) * Number(s.bsize);
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

export async function resolveStorage(): Promise<Resolved> {
  const now = Date.now();
  if (_resolved && now - _resolvedAt < RESOLVE_TTL_MS) return _resolved;
  if (isS3Configured()) {
    _resolved = { baseDir: "s3", kind: "s3", freeBytes: Number.MAX_SAFE_INTEGER };
  } else if (await tryDir(VOLUME_PATH)) {
    _resolved = { baseDir: VOLUME_PATH, kind: "volume", freeBytes: await freeBytes(VOLUME_PATH) };
  } else if (await tryDir(TMP_PATH)) {
    _resolved = {
      baseDir: TMP_PATH,
      kind: "tmp",
      freeBytes: Math.min(await freeBytes(TMP_PATH), TMPFS_LIMIT_BYTES),
    };
    console.warn(`[attachments] COMPLAINTS volume unavailable; using ${TMP_PATH}`);
  } else {
    throw new Error("No writable attachment storage");
  }
  _resolvedAt = now;
  return _resolved;
}

export interface SaveInput {
  complaintId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  stripExif: boolean;
}

export interface Saved {
  storagePath: string;
  storageKind: StorageKind;
  sha256: string;
  sizeBytes: number;
  exifStripped: boolean;
}

export async function saveAttachment(input: SaveInput): Promise<Saved> {
  if (input.buffer.length > MAX_BYTES) {
    throw Object.assign(new Error("FILE_TOO_LARGE"), { code: "FILE_TOO_LARGE", status: 413 });
  }
  const storage = await resolveStorage();
  if (storage.freeBytes < input.buffer.length * 2) {
    throw Object.assign(new Error("STORAGE_FULL"), { code: "STORAGE_FULL", status: 507 });
  }

  let buffer = input.buffer;
  let exifStripped = false;
  if (input.stripExif && /^image\//i.test(input.mimeType)) {
    try {
      const sharp = (await import("sharp")).default;
      buffer = await sharp(buffer).rotate().withMetadata({}).toBuffer();
      exifStripped = true;
    } catch (e) {
      console.warn("[attachments] sharp unavailable:", (e as Error).message);
    }
  }

  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const ext = extFromMime(input.mimeType) || extFromName(input.fileName) || "bin";
  const relativeKey = `${input.complaintId.replace(/[^a-zA-Z0-9\-_]/g, "_")}/${randomUUID()}.${ext}`;

  if (storage.kind === "s3") {
    const s3Key = `complaints/${relativeKey}`;
    await s3PutObject(s3Key, buffer, input.mimeType);
    return {
      storagePath: `s3://${s3Key}`,
      storageKind: "s3",
      sha256,
      sizeBytes: buffer.length,
      exifStripped,
    };
  }

  const fullPath = join(
    storage.baseDir,
    relativeKey,
  );
  await fs.mkdir(dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer, { mode: 0o640 });

  return {
    storagePath: fullPath,
    storageKind: storage.kind,
    sha256,
    sizeBytes: buffer.length,
    exifStripped,
  };
}

export async function readAttachment(p: string): Promise<Buffer | null> {
  if (p && p.startsWith("s3://")) {
    const key = p.replace("s3://", "");
    return s3GetObject(key);
  }

  // Control 7: Canary file tripwire
  // If an attacker attempts to read .env.bak, credentials.json, etc. via path traversal or direct read
  if (p && (p.includes(".env") || p.includes("production.env") || p.includes("credentials.json"))) {
    try {
      const { triggerDeceptionAlert } = await import("@/lib/deception");
      await triggerDeceptionAlert("canary_env", {
        details: { requestedPath: p, reason: "Attempted read of canary environment/credential decoy" },
      });
    } catch (err) {
      console.error("[deception] Error triggering canary_env alert:", err);
    }
  }

  try {
    return await fs.readFile(p);
  } catch {
    return null;
  }
}

export async function deleteAttachmentFile(p: string): Promise<void> {
  try {
    await fs.unlink(p);
  } catch {
    // idempotent
  }
}

export async function getStorageStatus() {
  const s = await resolveStorage();
  return { ...s, persistent: s.kind === "volume" };
}

function extFromMime(m: string): string | null {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/tiff": "tif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "application/pdf": "pdf",
  };
  return map[m.toLowerCase()] ?? null;
}

function extFromName(n: string): string | null {
  const m = n.match(/\.([a-z0-9]{1,8})$/i);
  return m ? m[1].toLowerCase() : null;
}
