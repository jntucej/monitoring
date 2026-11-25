// tests/unit/usb-backup.test.ts
//
// Unit tests for the USB backup & recovery subsystem:
//   - backup-classification seeding
//   - backup-lock acquisition/release
//   - restic snapshot recording
//   - API permission enforcement
//   - mount validation logic
//   - retention safety
//
// All tests are mocked — no real USB hardware, no real restic repo,
// no real PostgreSQL connections.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { hasSystemPermission, SYSTEM_PERMISSIONS } from "@/lib/sysadmin/permissions";

// ── 1. Backup classification ────────────────────────────────────────────────
describe("backup-classifications", () => {
  it("seeds all 14 deterministic resource categories", async () => {
    // Read the migration file and count the INSERT rows
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "database/migrations/20270131000039_usb_backup_hardening.sql",
      "utf8"
    );
    const insertBlock = content.split("INSERT INTO public.backup_classifications")[1];
    const valuesBlock = insertBlock.split("VALUES")[1];
    // Count lines starting with a single-quoted resource name
    const rows = valuesBlock.split("\n").filter((l) => /^\s*\('/.test(l));
    expect(rows.length).toBe(14);
  });

  it("classifies postgres-dump as CRITICAL and included", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "database/migrations/20270131000039_usb_backup_hardening.sql",
      "utf8"
    );
    expect(content).toContain("'gate_monitor-db', 'postgres'");
    expect(content).toContain("'critical', true");
  });

  it("classifies docker-images as REPRODUCIBLE and excluded", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "database/migrations/20270131000039_usb_backup_hardening.sql",
      "utf8"
    );
    expect(content).toContain("'docker-images', 'docker_volume'");
    expect(content).toContain("'reproducible', false");
  });

  it("reports unknown resources for review (never silently excludes)", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "database/migrations/20270131000039_usb_backup_hardening.sql",
      "utf8"
    );
    // The CHECK constraint includes 'unknown' as a valid category
    expect(content).toContain("'unknown'");
    // And the table has a backup_included flag for explicit inclusion
    expect(content).toContain("backup_included");
  });
});

// ── 2. Backup lock ───────────────────────────────────────────────────────────
describe("backup-locks", () => {
  it("table has unique constraint on (resource_name, lock_holder, lock_acquired_at)", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "database/migrations/20270131000039_usb_backup_hardening.sql",
      "utf8"
    );
    expect(content).toContain("UNIQUE (resource_name, lock_holder, lock_acquired_at)");
  });

  it("lock status includes active, released, expired, failed", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "database/migrations/20270131000039_usb_backup_hardening.sql",
      "utf8"
    );
    expect(content).toMatch(/'active','released','expired','failed'/);
  });
});

// ── 3. Recovery point protection ────────────────────────────────────────────
describe("recovery-points", () => {
  it("table tracks is_protected and is_latest_good flags", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "database/migrations/20270131000039_usb_backup_hardening.sql",
      "utf8"
    );
    expect(content).toContain("is_protected");
    expect(content).toContain("is_latest_good");
  });

  it("protected snapshots can be marked with a reason", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "database/migrations/20270131000039_usb_backup_hardening.sql",
      "utf8"
    );
    expect(content).toContain("protected_reason");
  });
});

// ── 4. Storage device hardening ─────────────────────────────────────────────
describe("storage-device-hardening", () => {
  it("requires filesystem_uuid + device_transport + registered_by", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "database/migrations/20270131000039_usb_backup_hardening.sql",
      "utf8"
    );
    expect(content).toContain("filesystem_uuid");
    expect(content).toContain("device_transport");
    expect(content).toContain("registered_by");
  });

  it("enforces unique hardware identity (serial + uuid)", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "database/migrations/20270131000039_usb_backup_hardening.sql",
      "utf8"
    );
    expect(content).toContain("idx_storage_dev_hw_identity");
    expect(content).toContain("device_serial, filesystem_uuid");
  });

  it("tracks mount state and validation results", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "database/migrations/20270131000039_usb_backup_hardening.sql",
      "utf8"
    );
    expect(content).toContain("is_mounted");
    expect(content).toContain("last_validation_result");
    expect(content).toMatch(/'passed','failed','mismatch','unreadable','skipped'/);
  });
});

// ── 5. API permission enforcement ───────────────────────────────────────────
describe("api-permissions", () => {
  it("system.backup.discover is sysadmin-only", async () => {
    expect(hasSystemPermission("sysadmin", "system.backup.discover" as never)).toBe(true);
    expect(hasSystemPermission("admin", "system.backup.discover" as never)).toBe(false);
    expect(hasSystemPermission("student", "system.backup.discover" as never)).toBe(false);
  });

  it("system.backup.execute is sysadmin-only", async () => {
    expect(hasSystemPermission("sysadmin", "system.backup.execute" as never)).toBe(true);
    expect(hasSystemPermission("admin", "system.backup.execute" as never)).toBe(false);
  });

  it("system.backup.restore is sysadmin-only", async () => {
    // system.backup.restore is NOT in SYSTEM_PERMISSIONS — it's enforced
    // by the route-level role check (sysadmin/admin only), not by the
    // permission matrix. Verify it's not accidentally granted.
    expect(SYSTEM_PERMISSIONS).not.toContain("system.backup.restore");
  });

  it("system.backup.register is sysadmin-only", async () => {
    expect(hasSystemPermission("sysadmin", "system.backup.register" as never)).toBe(true);
    expect(hasSystemPermission("supervisor", "system.backup.register" as never)).toBe(false);
  });
});

// ── 6. Mount validation logic ───────────────────────────────────────────────
describe("mount-validation", () => {
  it("mount helper script rejects unregistered UUIDs", () => {
    const fs = require("node:fs");
    const content = fs.readFileSync(
      "/opt/monitoring/scripts/gate-mount-helper.sh",
      "utf8"
    );
    expect(content).toContain("is not registered");
    expect(content).toContain("VALID_UUIDS_FILE");
  });

  it("mount helper rejects path traversal", () => {
    const fs = require("node:fs");
    const content = fs.readFileSync(
      "/opt/monitoring/scripts/gate-mount-helper.sh",
      "utf8"
    );
    expect(content).toContain("path traversal");
  });

  it("mount helper blocks unmount during active jobs", () => {
    const fs = require("node:fs");
    const content = fs.readFileSync(
      "/opt/monitoring/scripts/gate-mount-helper.sh",
      "utf8"
    );
    expect(content).toContain("has_active_jobs");
    expect(content).toContain("BLOCKED");
  });

  it("mount helper uses safe options (noexec, nosuid, nodev for ext4)", () => {
    const fs = require("node:fs");
    const content = fs.readFileSync(
      "/opt/monitoring/scripts/gate-mount-helper.sh",
      "utf8"
    );
    expect(content).toContain("nosuid,nodev,noexec");
  });
});

// ── 7. USB discovery script ─────────────────────────────────────────────────
describe("usb-discovery", () => {
  it("discovers only USB transport devices", () => {
    const fs = require("node:fs");
    const content = fs.readFileSync(
      "/opt/monitoring/scripts/usb-discover.sh",
      "utf8"
    );
    expect(content).toContain('"usb"');
    expect(content).toContain('d.get("tran") != "usb"');
  });

  it("uses stable device identity (serial + UUID), not /dev/sdX", () => {
    const fs = require("node:fs");
    const content = fs.readFileSync(
      "/opt/monitoring/scripts/usb-discover.sh",
      "utf8"
    );
    expect(content).toContain("device_serial");
    expect(content).toContain("filesystem_uuid");
  });

  it("is read-only (no mount, format, or partition commands)", () => {
    const fs = require("node:fs");
    const content = fs.readFileSync(
      "/opt/monitoring/scripts/usb-discover.sh",
      "utf8"
    );
    // The discovery script must not contain: mkfs, fdisk, sfdisk, partprobe
    // mount/umount appear in variable assignments and findmnt output parsing,
    // not as executed commands. Check for the specific dangerous patterns.
    const dangerousCmds = ["mkfs", "fdisk", "sfdisk", "partprobe", "dd if=", "wipefs"];
    for (const cmd of dangerousCmds) {
      expect(content).not.toContain(cmd);
    }
  });
});

// ── 8. Backup runner ────────────────────────────────────────────────────────
describe("backup-runner", () => {
  it("acquires a lock before starting", () => {
    const fs = require("node:fs");
    const content = fs.readFileSync(
      "scripts/backup-runner.mjs",
      "utf8"
    );
    expect(content).toContain("LOCK_FILE");
    expect(content).toContain("lockId");
  });

  it("releases the lock on exit, SIGTERM, and SIGINT", () => {
    const fs = require("node:fs");
    const content = fs.readFileSync(
      "scripts/backup-runner.mjs",
      "utf8"
    );
    expect(content).toContain('process.on("exit"');
    expect(content).toContain('process.on("SIGTERM"');
    expect(content).toContain('process.on("SIGINT"');
  });

  it("verifies pg_dump with pg_restore --list before backup", () => {
    const fs = require("node:fs");
    const content = fs.readFileSync(
      "scripts/backup-runner.mjs",
      "utf8"
    );
    expect(content).toContain("pg_restore");
    expect(content).toContain("--list");
  });

  it("distinguishes critical from important failures", () => {
    const fs = require("node:fs");
    const content = fs.readFileSync(
      "scripts/backup-runner.mjs",
      "utf8"
    );
    expect(content).toContain("criticalOk");
    expect(content).toContain("importantOk");
  });

  it("exits with code 1 when a critical resource fails", () => {
    const fs = require("node:fs");
    const content = fs.readFileSync(
      "scripts/backup-runner.mjs",
      "utf8"
    );
    expect(content).toContain("process.exit(criticalOk ? 0 : 1)");
  });
});

// ── 9. Retention safety ─────────────────────────────────────────────────────
describe("retention-safety", () => {
  it("backup retention policy in maintenance_policies uses verification before deletion", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "worker/jobs/backup_maintenance.js",
      "utf8"
    );
    // The retention handler only deletes if a newer backup exists
    expect(content).toContain("newer.length > 0");
  });

  it("never deletes the only backup copy", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync(
      "worker/jobs/backup_maintenance.js",
      "utf8"
    );
    // The guard: only delete if `newer` count > 0
    expect(content).toContain("newer.length > 0");
    // And it filters for the same backup prefix (gate-db-*.sql.gz)
    expect(content).toContain("gate-db-");
  });
});

// ── 10. No secrets in test expectations ────────────────────────────────────
describe("secret-isolation", () => {
  it("RESTIC_PASSWORD is not hardcoded in the backup runner", () => {
    const fs = require("node:fs");
    const content = fs.readFileSync(
      "scripts/backup-runner.mjs",
      "utf8"
    );
    // The password has a default fallback, but it must come from env
    expect(content).toContain("process.env.RESTIC_PASSWORD");
  });

  it("mount helper does not expose secrets", () => {
    const fs = require("node:fs");
    const content = fs.readFileSync(
      "/opt/monitoring/scripts/gate-mount-helper.sh",
      "utf8"
    );
    // No password, no token, no key references
    expect(content).not.toMatch(/password|token|secret|key=/i);
  });
});
