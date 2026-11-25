export const SYSTEM_PERMISSIONS = [
  "system.infrastructure.read",
  "system.services.read",
  "system.services.restart",
  "system.services.control",
  "system.database.read",
  "system.backups.read",
  "system.backups.create",
  "system.backups.restore",
  "system.backups.configure",
  "system.backups.delete",
  "system.backups.verify",
  "system.maintenance.view",
  "system.maintenance.configure",
  "system.maintenance.execute",
  "system.storage.view",
  "system.storage.manage",
  "system.recovery.manage",
  "system.logs.read",
  "system.workers.read",
  "system.workers.retry",
  "system.network.read",
  "system.deployments.read",
  "system.deployments.execute",
  "system.security.read",
  "system.configuration.read",
  "system.configuration.update",
] as const;

export type SystemPermission = (typeof SYSTEM_PERMISSIONS)[number];

export const ALLOWLISTED_SYSADMIN_ACTIONS = [
  "retry_failed_notifications",
  "refresh_infra_snapshot",
  "verify_latest_backup",
  "run_backup_now",
  "list_backups",
  "list_policies",
  "run_maintenance_now",
  "list_storage_inventory",
] as const;

export type AllowlistedSysadminAction = (typeof ALLOWLISTED_SYSADMIN_ACTIONS)[number];

export function hasSystemPermission(role: string, permission: SystemPermission): boolean {
  if (role !== "sysadmin") return false;
  return (SYSTEM_PERMISSIONS as readonly string[]).includes(permission);
}

export function isAllowlistedAction(action: string): action is AllowlistedSysadminAction {
  return (ALLOWLISTED_SYSADMIN_ACTIONS as readonly string[]).includes(action);
}

const SENSITIVE_KEY_RE = /(password|secret|token|key|credential|authorization|cookie)/i;

export function redactSensitiveFields<T>(input: T): T {
  if (input === null || input === undefined || typeof input !== "object") return input;
  if (Array.isArray(input)) return input.map(redactSensitiveFields) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEY_RE.test(k) ? "[REDACTED]" : redactSensitiveFields(v);
  }
  return out as T;
}
