// src/lib/schemas/sysadmin.ts
// U5: Zod schemas for sysadmin routes.

import { z } from "zod";
import { ALLOWLISTED_SYSADMIN_ACTIONS } from "@/lib/sysadmin/permissions";

// Backup-maintenance-center POST: `action` must be a known allowlisted string
// (the route re-checks it against ALLOWLISTED_SYSADMIN_ACTIONS and 403s, but
// validating it up front gives a clean 400 VALIDATION_ERROR instead of a
// 403 ACTION_NOT_ALLOWED for typos). `policy_id` and `limit` are optional
// per-action fields.
//
// Using an open object (`passthrough`) so unknown extra fields don't cause a
// 400 — the route only reads the fields it knows about.
const actionEnum = z.enum(
  ALLOWLISTED_SYSADMIN_ACTIONS as unknown as [string, ...string[]]
);

export const BackupCenterActionSchema = z.object({
  action: actionEnum,
  policy_id: z.string().max(64).optional(),
  limit: z.number().int().positive().max(100).optional(),
}).passthrough();

export type BackupCenterActionInput = z.infer<typeof BackupCenterActionSchema>;
