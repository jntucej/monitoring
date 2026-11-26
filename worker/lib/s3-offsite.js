// worker/lib/s3-offsite.js
// U10: S3 offsite backup upload helper (disabled by default until AWS creds are provisioned).

import { readFileSync } from "node:fs";
import path from "node:path";

export function isOffsiteConfigured(env = process.env) {
  if (env.OFFSITE_S3_ENABLED !== "1") {
    return { ok: false, reason: "disabled" };
  }
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    return { ok: false, reason: "missing_credentials" };
  }
  return { ok: true, reason: null };
}

export async function uploadBackupToS3({
  filePath,
  bucket,
  prefix = "gate-monitor/backups",
  checksumSha256 = "",
  env = process.env,
  clientFactory,
}) {
  const cfg = isOffsiteConfigured(env);
  if (!cfg.ok) {
    return { uploaded: false, reason: cfg.reason };
  }
  if (!bucket) {
    return { uploaded: false, reason: "missing_bucket" };
  }

  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = clientFactory
    ? clientFactory()
    : new S3Client({
        region: env.AWS_REGION || "ap-south-1",
        ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT, forcePathStyle: true } : {}),
      });

  const cleanPrefix = String(prefix || "").replace(/^\/+|\/+$/g, "");
  const fileName = path.basename(filePath);
  const key = cleanPrefix ? `${cleanPrefix}/${fileName}` : fileName;
  const body = readFileSync(filePath);

  const res = await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ServerSideEncryption: "AES256",
      Metadata: checksumSha256 ? { sha256: checksumSha256 } : undefined,
    })
  );

  return {
    uploaded: true,
    bucket,
    key,
    etag: res?.ETag ?? null,
  };
}
