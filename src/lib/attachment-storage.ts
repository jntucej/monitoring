import { readFile, unlink, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { ForbiddenError, ServiceUnavailableError } from "@/server/http/errors";

/**
 * Attachment storage backed by the mounted upload volume.
 *
 * If the volume is missing or unwritable we FAIL LOUD: no silent fallback to
 * /tmp, because attachments are evidence and losing them is unacceptable.
 */
const VOLUME_DIR = resolve(process.env.UPLOAD_DIR ?? "/app/data/uploads");

/**
 * Canonicalize + confine a user-supplied path under the upload volume base.
 * Rejects anything that escapes BASE (e.g. `../../etc/passwd`).
 */
function safePath(p: string): string {
  const full = resolve(VOLUME_DIR, p);
  if (!full.startsWith(VOLUME_DIR + sep)) {
    throw new ForbiddenError("Invalid attachment path");
  }
  return full;
}

let volumeChecked = false;
let volumeAvailable = false;

/**
 * Confirm the upload volume is mounted and writable. Call once at startup.
 */
export async function tryDir(dir: string): Promise<boolean> {
  try {
    await writeFile(`${dir}/.healthcheck`, "ok", { flag: "wx" });
    await unlink(`${dir}/.healthcheck`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve the storage root and verify it is writable. Throws if unavailable.
 */
export async function resolveStorage(): Promise<string> {
  if (!volumeChecked) {
    volumeAvailable = await tryDir(VOLUME_DIR);
    volumeChecked = true;
  }
  if (!volumeAvailable) {
    throw new ServiceUnavailableError(
      "Attachment volume not mounted or not writable. Refusing to accept uploads.",
    );
  }
  return VOLUME_DIR;
}

/**
 * Read an attachment file, confined to the upload volume.
 */
export async function readAttachment(p: string): Promise<Buffer> {
  const full = safePath(p);
  return readFile(full);
}

/**
 * Delete an attachment file, confined to the upload volume.
 */
export async function deleteAttachmentFile(p: string): Promise<void> {
  const full = safePath(p);
  await unlink(full);
}

/**
 * Write an attachment file, confined to the upload volume.
 */
export async function writeAttachment(p: string, data: Buffer): Promise<void> {
  const full = safePath(p);
  await writeFile(full, data);
}
