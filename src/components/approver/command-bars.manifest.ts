/**
 * approver/command-bars.manifest.ts — registry of all command-bar shells.
 *
 * Each entry lists the bar + which kernel command set it uses. The
 * conformance test iterates this manifest to assert no shell re-inlines
 * its own parser. When you add a 16th bar, add it here.
 *
 * This is the guardrail that keeps the "kernel never forks" line intact.
 */

export interface CommandBarManifestEntry {
  /** The shell file (for grep / docs). */
  file: string;
  /** The bar's export name. */
  exportName: string;
  /** The kernel command set the bar parses against. */
  commandSet:
    | "BASE"
    | "DEPUTY"
    | "CARETAKER"
    | "HOSTEL_MANAGER"
    | "ROLE_SPECIFIC";
  /** Does the bar have a role-specific custom parser (e.g. allocate)? */
  hasCustomParser?: boolean;
  /**
   * "hollowed" = imports the kernel parser (the model's target state).
   * "as-is"     = still copy-pasted, pending its Phase-4 PR.
   * "inherited" = thin wrapper over the base PermissionCommandBar (no parser of its own —
   *               already conforms by not having one).
   */
  conformed?: "hollowed" | "as-is" | "inherited";
}

export const COMMAND_BARS_MANIFEST: CommandBarManifestEntry[] = [
  // Hollowed (uses kernel parser):
  { file: "HostelManagerCommandBar.tsx", exportName: "HostelManagerCommandBar", commandSet: "HOSTEL_MANAGER", hasCustomParser: true, conformed: "hollowed" },

  // Not yet hollowed (still has its own parseCommand) — Phase 4, one role per PR:
  { file: "PermissionCommandBar.tsx", exportName: "PermissionCommandBar", commandSet: "BASE", conformed: "as-is" },
  { file: "DeputyWardenCommandBar.tsx", exportName: "DeputyWardenCommandBar", commandSet: "DEPUTY", conformed: "as-is" },
  { file: "CaretakerCommandBar.tsx", exportName: "CaretakerCommandBar", commandSet: "CARETAKER", conformed: "as-is" },
  { file: "SupervisorCommandBar.tsx", exportName: "SupervisorCommandBar", commandSet: "ROLE_SPECIFIC", conformed: "as-is" },
  { file: "MessInchargeCommandBar.tsx", exportName: "MessInchargeCommandBar", commandSet: "ROLE_SPECIFIC", conformed: "as-is" },
  { file: "ExamBranchCommandBar.tsx", exportName: "ExamBranchCommandBar", commandSet: "ROLE_SPECIFIC", conformed: "as-is" },
  { file: "ExamSuperintendentCommandBar.tsx", exportName: "ExamSuperintendentCommandBar", commandSet: "ROLE_SPECIFIC", conformed: "as-is" },
  { file: "OieCommandBar.tsx", exportName: "OieCommandBar", commandSet: "ROLE_SPECIFIC", conformed: "as-is" },
  { file: "AdminCommandBar.tsx", exportName: "AdminCommandBar", commandSet: "ROLE_SPECIFIC", conformed: "as-is" },
  { file: "PrincipalCommandBar.tsx", exportName: "PrincipalCommandBar", commandSet: "ROLE_SPECIFIC", conformed: "hollowed" },
  { file: "SysadminCommandBar.tsx", exportName: "SysadminCommandBar", commandSet: "ROLE_SPECIFIC", conformed: "as-is" },

  // Inherited (thin wrappers over the base bar; no parser of their own — conform by absence):
  { file: "ParentCommandBar.tsx", exportName: "ParentCommandBar", commandSet: "BASE", conformed: "inherited" },
  { file: "VpCommandBar.tsx", exportName: "VpCommandBar", commandSet: "BASE", conformed: "inherited" },
  { file: "WorkerCommandBar.tsx", exportName: "WorkerCommandBar", commandSet: "BASE", conformed: "inherited" },
];

export default COMMAND_BARS_MANIFEST;
