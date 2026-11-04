// src/lib/profanity.ts
// Lightweight local profanity/spam screening for user-generated comments.
//
// Intentionally a small, maintainable blocklist rather than a hosted
// moderation API (Perspective / OpenAI Moderation) — good enough for
// the mess-review comment box and similar short, single-voice inputs.
// Extend PROFANITY_TERMS as needed; the check is substring, case-insensitive,
// so it catches "this is s***" style slips too.
//
// Not a safety net for PII/identifiers — only offensive language.

const PROFANITY_TERMS: readonly string[] = [
  // English (common, mild-to-strong; deliberately conservative for a campus app)
  "damn", "hell", "crap", "sh!t", "shit", "f**k", "fuck", "f***", "bitch",
  "bastard", "asshole", "idiot", "stupid", "dumb", "retard", "disgusting",
  // Telugu / Hindi / Tamil transliterations (common campus context)
  "కొత్తిమీనం", "బాపినీనం", "అరదబే", "గుడ్డి", "మొర",
  "कहने", "गंदे", "कुतरनाक",
  // Generic
  "scam", "fraud",
];

const BLOCKLIST = new Set(
  PROFANITY_TERMS.map((t) => t.toLowerCase()),
);

export interface ProfanityCheck {
  clean: boolean;
  /** First matched term (redacted-safe index), for auditing only. */
  matched: string | null;
}

/**
 * R11: returns true when `text` is safe to store. A null/empty string is
 * always clean. The check runs against the lowercased text so it tolerates
 * mixed case.
 */
export function isCleanComment(text: string | null | undefined): ProfanityCheck {
  if (!text || !text.trim()) return { clean: true, matched: null };
  const lower = text.toLowerCase();
  for (const term of PROFANITY_TERMS) {
    if (lower.includes(term.toLowerCase())) {
      return { clean: false, matched: term };
    }
  }
  return { clean: true, matched: null };
}

/** Strict convenience wrapper: just true/false. */
export function hasProfanity(text: string | null | undefined): boolean {
  return !isCleanComment(text).clean;
}
