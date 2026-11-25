import { describe, it, expect } from "vitest";
import {
  hasSystemPermission,
  isAllowlistedAction,
  redactSensitiveFields,
  SYSTEM_PERMISSIONS,
} from "@/lib/sysadmin/permissions";

describe("System Administration Center — Permissions & Security", () => {
  it("grants all 17 system.* permissions exclusively to sysadmin", () => {
    for (const perm of SYSTEM_PERMISSIONS) {
      expect(hasSystemPermission("sysadmin", perm)).toBe(true);
      expect(hasSystemPermission("admin", perm)).toBe(false);
      expect(hasSystemPermission("principal", perm)).toBe(false);
      expect(hasSystemPermission("student", perm)).toBe(false);
    }
  });

  it("enforces allowlisted sysadmin actions only", () => {
    expect(isAllowlistedAction("retry_failed_notifications")).toBe(true);
    expect(isAllowlistedAction("verify_latest_backup")).toBe(true);
    expect(isAllowlistedAction("rm -rf /")).toBe(false);
    expect(isAllowlistedAction("docker_exec")).toBe(false);
  });

  it("redacts sensitive keys from logs and diagnostics", () => {
    const clean = redactSensitiveFields({
      action: "LOGIN",
      password: "secret",
      auth_token: "jwt",
      nested: { apiKey: "123", ok: true },
    });
    expect(clean.password).toBe("[REDACTED]");
    expect(clean.auth_token).toBe("[REDACTED]");
    expect(clean.nested.apiKey).toBe("[REDACTED]");
    expect(clean.nested.ok).toBe(true);
  });
});
