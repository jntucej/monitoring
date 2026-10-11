import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * I6: signature is bound to the document bytes + ticket + signer + timestamp.
 */
export function sha256Hex(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

export async function computeSignatureHash(params: {
  documentBytes: Buffer;
  ticketNumber: string;
  signerId: string;
  timestampMs: number;
}): Promise<string> {
  const { documentBytes, ticketNumber, signerId, timestampMs } = params;
  const ticketBytes = Buffer.from(`${ticketNumber}|${signerId}|${timestampMs}`, "utf8");
  return sha256Hex(Buffer.concat([documentBytes, ticketBytes]));
}

/**
 * Loads document bytes.
 */
export async function fetchDocumentBytes(documentUrl: string): Promise<Buffer> {
  const UPLOADS_ROOT = process.env.DOCUMENT_UPLOADS_ROOT || "/var/lib/gate-monitor/uploads";
  const resolved = join(UPLOADS_ROOT, documentUrl.replace(/^\/+/, ""));
  if (!resolved.startsWith(UPLOADS_ROOT)) {
    throw new Error("Document path escapes uploads root");
  }
  return readFile(resolved);
}
