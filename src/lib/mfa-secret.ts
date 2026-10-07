import crypto from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.TOTP_ENCRYPTION_KEY;
  if (!raw || raw.length < 64) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "TOTP_ENCRYPTION_KEY missing or too short (must be 32 bytes hex, >= 64 chars in production)"
      );
    }
    return crypto.createHash("sha256").update("dev-insecure-totp-key-change-me").digest();
  }
  return Buffer.from(raw, "hex");
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
