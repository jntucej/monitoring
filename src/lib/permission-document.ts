import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

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
 * Resolves (and sanitizes) the per-ticket upload directory for a ticket number.
 * Strips path separators so a crafted ticket number can never escape the root.
 */
export function ticketDir(ticketNumber: string): string {
  const safe = String(ticketNumber).replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(UPLOADS_ROOT, safe);
}

/** Absolute path of the uploaded (unsigned) document for a ticket. */
export function documentPath(ticketNumber: string): string {
  return path.join(ticketDir(ticketNumber), DOCUMENT_FILENAME);
}

/** Absolute path of the digitally signed document for a ticket. */
export function signedDocumentPath(ticketNumber: string): string {
  return path.join(ticketDir(ticketNumber), SIGNED_FILENAME);
}

/** True when the ticket has an uploaded document on disk. */
export async function documentExists(ticketNumber: string): Promise<boolean> {
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
  try {
    return await fs.readFile(documentPath(ticketNumber));
  } catch {
    return null;
  }
}

/** Reads the signed document bytes, or null when absent. */
export async function readSignedDocument(ticketNumber: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(signedDocumentPath(ticketNumber));
  } catch {
    return null;
  }
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
