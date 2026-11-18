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
}

export type RoleRegistry = Partial<Record<Role, RoleConfig>>;
