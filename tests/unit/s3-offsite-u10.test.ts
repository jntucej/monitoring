import { describe, it, expect, vi } from "vitest";
import { writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { isOffsiteConfigured, uploadBackupToS3 } from "../../worker/lib/s3-offsite.js";

describe("U10 — S3 Offsite Backup Upload", () => {
  it("is disabled by default when OFFSITE_S3_ENABLED is not '1'", async () => {
    expect(isOffsiteConfigured({})).toEqual({ ok: false, reason: "disabled" });
    const res = await uploadBackupToS3({
      filePath: "/tmp/nonexistent.sql.gz",
      bucket: "my-bucket",
      env: {},
    });
    expect(res).toEqual({ uploaded: false, reason: "disabled" });
  });

  it("returns missing_credentials when enabled without AWS keys", async () => {
    const res = await uploadBackupToS3({
      filePath: "/tmp/nonexistent.sql.gz",
      bucket: "my-bucket",
      env: { OFFSITE_S3_ENABLED: "1" },
    });
    expect(res).toEqual({ uploaded: false, reason: "missing_credentials" });
  });

  it("returns missing_bucket when bucket is empty", async () => {
    const res = await uploadBackupToS3({
      filePath: "/tmp/nonexistent.sql.gz",
      bucket: "",
      env: {
        OFFSITE_S3_ENABLED: "1",
        AWS_ACCESS_KEY_ID: "AKIA_TEST",
        AWS_SECRET_ACCESS_KEY: "SECRET_TEST",
      },
    });
    expect(res).toEqual({ uploaded: false, reason: "missing_bucket" });
  });

  it("uploads backup with AES256 encryption and sha256 metadata when configured", async () => {
    const tmpFile = path.join(os.tmpdir(), `u10-test-${Date.now()}.sql.gz`);
    writeFileSync(tmpFile, "dummy-backup-bytes");
    const sendMock = vi.fn().mockResolvedValue({ ETag: '"etag-123"' });

    try {
      const res = await uploadBackupToS3({
        filePath: tmpFile,
        bucket: "gate-backups",
        prefix: "prod/daily",
        checksumSha256: "deadbeef",
        env: {
          OFFSITE_S3_ENABLED: "1",
          AWS_ACCESS_KEY_ID: "AKIA_TEST",
          AWS_SECRET_ACCESS_KEY: "SECRET_TEST",
        },
        clientFactory: () => ({ send: sendMock }),
      });

      expect(res).toEqual({
        uploaded: true,
        bucket: "gate-backups",
        key: `prod/daily/${path.basename(tmpFile)}`,
        etag: '"etag-123"',
      });
      expect(sendMock).toHaveBeenCalledTimes(1);
      const cmd = sendMock.mock.calls[0][0];
      expect(cmd.input).toMatchObject({
        Bucket: "gate-backups",
        ServerSideEncryption: "AES256",
        Metadata: { sha256: "deadbeef" },
      });
    } finally {
      unlinkSync(tmpFile);
    }
  });
});
