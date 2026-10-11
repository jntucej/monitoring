import type { Role } from "./types";

/**
 * Feature registry. Add a feature here, then wrap its JSX with
 * <RoleGate feature="…">. Unknown features default to visible (fail-open)
 * so adding a gate never silently blanks a page.
 *
 *   allow: roles that may see the feature
 *   deny:  roles that may NOT (wins over allow)
 *   minTier: optional numeric floor (see alert-hierarchy.ts)
 */
export interface FeatureRule {
  allow?: Role[];
  deny?: Role[];
  minTier?: number;
}

export const FEATURE_RULES: Record<string, FeatureRule> = {
  // ── Student portal — alerts are hidden by default ────────────────────────
  "student.alerts":              { deny: ["student", "parent", "guardian", "visitor"] },
  "student.alerts.dashboard":    { deny: ["student", "parent", "guardian", "visitor"] },
  "student.alerts.bell":         { deny: ["student", "parent", "guardian", "visitor"] },
  "student.alerts.banner":       { deny: ["student", "parent", "guardian", "visitor"] },
  "student.alerts.nav":          { deny: ["student", "parent", "guardian", "visitor"] },
  "student.alerts.activity":     { deny: ["student", "parent", "guardian", "visitor"] },
  // SCAFFOLD:FEATURES — new rules are injected above this line
};

/** Global kill-switch: any string matching this is hidden regardless of rule. */
export const GLOBAL_HIDDEN_FEATURES: string[] = [];
