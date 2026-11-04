import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { isS3Configured, s3PutObject, s3GetObject, s3ObjectExists } from "@/lib/s3-storage";
import { safeJoin } from "@/lib/safe-path";
import { BadRequestError } from "@/server/http/errors";

/**
 * Permission document storage helpers (Step 7).
 *
 * Uploaded / signed PDFs live on the local disk under
 * `data/uploads/permissions/{ticketNumber}/` (gitignored). This module owns the
 * path resolution + fs read/write primitives and the SHA-256 signature hash so
 * the upload / document / sign routes share one implementation.
 *
 * ponytail: local-disk storage with in-process fs is fine for a single-instance
 * deployment; multi-instance or serverless hosting would need a shared object
 * store (S3 / Supabase Storage) behind these same three functions.
 */

const UPLOADS_ROOT = path.join(process.cwd(), "data", "uploads", "permissions");

export const DOCUMENT_FILENAME = "document.pdf";
export const SIGNED_FILENAME = "document_signed.pdf";

/**
 * Resolve (and sanitize) the per-ticket upload directory for a ticket number.
 * Replaces every character outside the allowlist with `_`, so a crafted
 * ticket like `../../../etc/passwd` becomes `______etc_passwd` and is
 * contained under UPLOADS_ROOT (defense-in-depth: even a regex missup
 * can't escape the root). Throws for empty or >128-char ticket numbers
 * since those are never valid generated tickets.
 */
export function ticketDir(ticketNumber: string): string {
  const t = String(ticketNumber);
  if (t.length === 0 || t.length > 128) {
    throw new BadRequestError("invalid ticket number");
  }
  // Sanitize the whole ticket as a single string BEFORE it reaches the
  // per-segment regex in safeJoin. `.` is deliberately NOT in the
  // allowlist here: a segment starting with `.` is rejected by safeJoin
  // anyway, so `..` / `.` / `...` all become `_` and `../../../etc/passwd`
  // becomes `______etc_passwd` — a valid, contained segment. The route
  // layer (upload / document / sign) still runs assertSafeTicket first for
  // legitimate API input, so this is defense-in-depth only.
  const sanitized = t.replace(/[^A-Za-z0-9_-]/g, "_");
  return safeJoin(UPLOADS_ROOT, sanitized);
}

/** Absolute path of the uploaded (unsigned) document for a ticket. */
export function documentPath(ticketNumber: string): string {
  return safeJoin(ticketDir(ticketNumber), DOCUMENT_FILENAME);
}

/** Absolute path of the digitally signed document for a ticket. */
export function signedDocumentPath(ticketNumber: string): string {
  return safeJoin(ticketDir(ticketNumber), SIGNED_FILENAME);
}

/** True when the ticket has an uploaded document on disk. */
export async function documentExists(ticketNumber: string): Promise<boolean> {
  if (isS3Configured()) {
    const safe = s3KeySegment(ticketNumber);
    return s3ObjectExists(`permissions/${safe}/${DOCUMENT_FILENAME}`);
  }
  try {
    await fs.access(documentPath(ticketNumber));
    return true;
  } catch {
    return false;
  }
}

/** Ensures the per-ticket upload directory exists (create-on-demand). */
export async function ensureTicketDir(ticketNumber: string): Promise<string> {
  const dir = ticketDir(ticketNumber);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Reads the uploaded document bytes, or null when absent. */
export async function readDocument(ticketNumber: string): Promise<Buffer | null> {
  if (isS3Configured()) {
    const safe = s3KeySegment(ticketNumber);
    return s3GetObject(`permissions/${safe}/${DOCUMENT_FILENAME}`);
  }
  try {
    return await fs.readFile(documentPath(ticketNumber));
  } catch {
    return null;
  }
}

/** Reads the signed document bytes, or null when absent. */
export async function readSignedDocument(ticketNumber: string): Promise<Buffer | null> {
  if (isS3Configured()) {
    const safe = s3KeySegment(ticketNumber);
    return s3GetObject(`permissions/${safe}/${SIGNED_FILENAME}`);
  }
  try {
    return await fs.readFile(signedDocumentPath(ticketNumber));
  } catch {
    return null;
  }
}

/** Writes uploaded document bytes to storage (disk or S3). */
export async function writeDocument(ticketNumber: string, bytes: Buffer): Promise<void> {
  if (isS3Configured()) {
    const safe = s3KeySegment(ticketNumber);
    await s3PutObject(`permissions/${safe}/${DOCUMENT_FILENAME}`, bytes, "application/pdf");
    return;
  }
  await ensureTicketDir(ticketNumber);
  await fs.writeFile(documentPath(ticketNumber), bytes);
}

/** Writes signed document bytes to storage (disk or S3). */
export async function writeSignedDocument(ticketNumber: string, bytes: Buffer): Promise<void> {
  if (isS3Configured()) {
    const safe = s3KeySegment(ticketNumber);
    await s3PutObject(`permissions/${safe}/${SIGNED_FILENAME}`, bytes, "application/pdf");
    return;
  }
  await ensureTicketDir(ticketNumber);
  await fs.writeFile(signedDocumentPath(ticketNumber), bytes);
}

/**
 * Validates a ticket number against the strict allowlist and returns it
 * as an S3 key segment. S3 keys have no directory semantics, but the
 * allowlist still guarantees no `..`, no NUL, no encoded traversal.
 * Same character set as ticketDir's sanitizer so local-disk and S3
 * layouts stay in lockstep.
 */
function s3KeySegment(ticketNumber: string): string {
  const t = String(ticketNumber);
  if (t.length === 0 || t.length > 128) {
    throw new BadRequestError("invalid ticket number");
  }
  return t.replace(/[^A-Za-z0-9_-]/g, "_");
}

/**
 * Computes the SHA-256 signature hash over the document bytes bound to the
 * ticket, signer, and timestamp: sha256(bytes || ticket || signer || timestamp).
 */
export function computeSignatureHash(
  documentBytes: Buffer,
  ticketNumber: string,
  signerUserId: string,
  signedAtIso: string
): string {
  return createHash("sha256")
    .update(documentBytes)
    .update(ticketNumber, "utf8")
    .update(signerUserId, "utf8")
    .update(signedAtIso, "utf8")
    .digest("hex");
}
