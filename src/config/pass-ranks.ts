// src/config/pass-ranks.ts
// Rank tiers for hostel passes (the Warden ≡ Principal institution).
//
// Caretaker (rank 1) → Deputy Warden (rank 2) → Warden/Principal (rank 3)
// The Vice-Principal is NOT in the hostel pass chain — they get a daily
// digest for accountability, not an approver stage.
//
// Pass types map to a required rank. A generator can only issue passes at
// or below their rank: Deputy Warden can generate rank-1 + rank-2, but
// NOT rank-3 (medical / emergency / official duty). Warden/Principal can
// generate any. Caretaker does NOT generate — they approve rank-1 only.

export type PassRank = 1 | 2 | 3;

// The direct-generate endpoint speaks the exit-flow reason vocabulary
// (home_out / day_pass / emergency / special_leave). Rank these four;
// unknown reasons default to rank 3 (fail-safe: only the top tier issues).
export const PASS_RANK_BY_TYPE: Record<string, PassRank> = {
  home_out: 1,
  day_pass: 1,
  special_leave: 2,
  emergency: 3,
};

/** Roles that may direct-generate a pass of a given reason, and at what rank. */
export const GENERATE_ROLE_RANK: Record<string, PassRank> = {
  deputy_warden: 2, // up to rank 2 (NOT rank-3 medical/emergency/official)
  principal: 3, // Warden ≡ Principal — full tier
  admin: 3,
  sysadmin: 3,
  // caretaker + hostel_manager are intentionally ABSENT: they approve /
  // operate, they do not generate. (The old DIRECT_GENERATE_ROLES list
  // included them — see the endpoint guard.)
};

export function canGenerate(role: string, reason: string): boolean {
  const maxRank = GENERATE_ROLE_RANK[role];
  if (!maxRank) return false;
  const reqRank = PASS_RANK_BY_TYPE[reason] ?? 3;
  return maxRank >= reqRank;
}
