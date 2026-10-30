import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { isS3Configured, getS3Bucket } from "@/lib/s3-storage";
import { resolveStorage, type StorageKind } from "@/lib/attachment-storage";
import { documentExists, ticketDir } from "@/lib/permission-document";

describe("Multi-Instance Storage Contract", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("identifies S3 configuration correctly when S3_ENDPOINT is set", () => {
    process.env.S3_ENDPOINT = "http://minio:9000";
    process.env.S3_BUCKET = "test-bucket";
    expect(isS3Configured()).toBe(true);
    expect(getS3Bucket()).toBe("test-bucket");
  });

  it("falls back to local storage when S3_ENDPOINT is unset", () => {
    delete process.env.S3_ENDPOINT;
    expect(isS3Configured()).toBe(false);
  });

  it("sanitizes ticket directory names preventing path traversal", () => {
    const maliciousTicket = "../../../etc/passwd";
    const dir = ticketDir(maliciousTicket);
    expect(dir).not.toContain("../");
    expect(dir).toContain("______etc_passwd");
  });
});
