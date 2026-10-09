import crypto from "crypto";
import { requireSecret } from "@/lib/env";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  return Buffer.from(requireSecret("TOTP_ENCRYPTION_KEY", 64), "hex");
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64")}.${enc.toString("base64")}.${tag.toString("base64")}`;
}

export function decryptSecret(sealed: string): string {
  if (!sealed) return "";
  if (!sealed.startsWith("v1.")) {
    // Graceful fallback for unencrypted plaintext (e.g. legacy or test data)
    return sealed;
  }
  const parts = sealed.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("unsupported secret version or malformed ciphertext");
  }
  const [, ivB64, encB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const enc = Buffer.from(encB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
