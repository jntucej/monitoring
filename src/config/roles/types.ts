// src/config/roles/types.ts
//
// RoleConfig — the single source of truth for what a role "feels like".
// L1 identity, L2 vocabulary, L3 layout, L4 adaptive, L5 personal.
//
// Every field is optional: a missing field means "use the default".
// This is what makes 22 roles cheap to add — you only override what
// actually differs from the graphite baseline.

import type { Role } from "@/lib/roles";

export type MotionPreset = "calm" | "swift" | "playful" | "instant" | "composed" | "steady";

export interface IdentityConfig {
  accent: string;
  accentMuted: string;
  surfaceTint: string;
  radius: "sm" | "md" | "lg";
  motionPreset: MotionPreset;
}

export interface HomeWidget {
  widget: string;
  size: "sm" | "md" | "lg";
}

export interface BotPersona {
  subtitle: string;
  chips: string[];
  questions: string[];
}

export interface OnboardingStep {
  target: string;
  title: string;
  body: string;
}

export interface OnboardingScript {
  steps: OnboardingStep[];
}

/**
 * P1: the context a nav/capability condition is evaluated against.
 * This is the "life/campus condition" layer of the capability model:
 * PERSON → LIFE/CAMPUS CONDITION → CURRENT TASK → CAPABILITIES → UI.
 *
 * A pure value — no DB, no fetch. The same context drives both the
 * server resolver (enforcement) and the client projection (UX).
 */
export interface WorkspaceContext {
  /** the person's roles (e.g. ["student"]). */
  roles: string[];
  /** person type (student / operator / principal / …). */
  personType: string;
  /** where they live: hosteller | day_scholar | n_a (stable). */
  residentialStatus: "hosteller" | "day_scholar" | "n_a";
  /** where they are NOW: in_campus | out_campus | unknown (live). */
  campusStatus: "in_campus" | "out_campus" | "unknown";
  /** hostel block/room, when residentialStatus === hosteller. */
  hostel?: { blockId: string | null; roomId: string | null };
  /** the person's roll / admission number (student_details.roll), when present. */
  roll?: string | null;
  /** gender (affects applicable hostel policy, not just labels). */
  gender?: string | null;
  /** active gate passes / approvals this person holds right now. */
  activeAuthorizations: Array<{
    kind: string;
    code: string;
    status: "active" | "expired" | "pending";
    expectedReturnAt?: string | null;
    parentAcknowledged?: boolean;
  }>;
  /** approval stages this person can act on (resolved, not hardcoded). */
  activeApprovals: Array<{ stage: string; role: string; domain: string }>;
}

/**
 * P1: a nav entry with a pure condition. The array of nav items stays;
 * the filter changes from `if (role === …)` to `when(ctx)`.
 */
export interface NavEntry {
  key: string;
  label: string;
  /** "security" (fail closed on error) | "ux" (fail open on error). */
  kind?: "security" | "ux";
  /** pure predicate: true = show this nav item for this context. */
  when?: (ctx: WorkspaceContext) => boolean;
}

/**
 * P1: a capability entry with a pure condition.
 * Separate `view` / `act` / `approve` are separate entries (guardrail #6).
 */
export interface CapabilityEntry {
  id: string;
  label: string;
  /** "security" (fail closed) | "ux" (fail open). */
  kind?: "security" | "ux";
  /** pure predicate: true = this capability is granted for this context. */
  when: (ctx: WorkspaceContext) => boolean;
}

export interface RoleConfig {
  id: Role;
  label: string;
  identity: IdentityConfig;
  vocabulary: Record<string, string>;
  home: HomeWidget[];
  signature: string;
  emptyCopy: Record<string, string>;
  loadingCopy: Record<string, string>;
  botPersona: BotPersona;
  onboarding: OnboardingScript;
  greetingTemplate: string;
  /** P1: nav items with `when(ctx)` conditions. The config is the source of truth. */
  nav?: NavEntry[];
  /** P1: capabilities with `when(ctx)` conditions. The config is the source of truth. */
  capabilities?: CapabilityEntry[];
  /**
   * P1: approval chain stages for this role's domain. Each stage declares
   * the role that handles it + a `when(ctx)` condition + an optional
   * substitute role (for delegation). The pure workflow module reads this
   * instead of a hardcoded chain.
   */
  stages?: ApprovalStageConfig[];
}

/** P1: a single stage in the approval chain. */
export interface ApprovalStageConfig {
  /** the role that handles this stage. */
  role: string;
  /** domain: "hostel" | "academic" | "emergency" | … */
  domain?: string;
  /** pure predicate: true = this stage applies to this context. */
  when?: (ctx: WorkspaceContext) => boolean;
  /** substitute role (for delegation / fallback). */
  substitute?: string;
  /** label for audit / explain-why. */
  label?: string;
}

export type RoleRegistry = Partial<Record<Role, RoleConfig>>;
