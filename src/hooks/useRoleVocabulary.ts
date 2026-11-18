// src/hooks/useRoleVocabulary.ts
//
// useRoleVocabulary() — returns t(key) that maps a generic noun to
// the role-specific word. t("students") → "candidates" for OIE,
// "residents" for Warden, "your students" for Faculty.
//
// Falls back to the key itself if no mapping exists (safe default).

import { useRoleConfig } from "./useRoleConfig";

export function useRoleVocabulary() {
  const cfg = useRoleConfig();
  const vocab = cfg?.vocabulary ?? {};

  return {
    t: (key: string): string => vocab[key] ?? key,
    // Convenience: returns "the " + translated noun
    noun: (key: string): string => `the ${vocab[key] ?? key}`,
  };
}
