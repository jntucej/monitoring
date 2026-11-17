// src/lib/personalization/prefs.ts
/**
 * Personalization prefs — the four explicit settings (never inferred):
 *  quiet hours · density · digest time · raw-review consent.
 *
 * The creepy line, enforced at the API boundary:
 *  - quiet hours are ASKED (onboarding / /settings), never inferred
 *    from message behaviour
 *  - register/density are CHOSEN, never detected
 *  - the bot remembers the schedule's history (attendance_seen),
 *    never the user's behaviour history
 */
import { query } from "@/lib/postgres";

export interface PersonalizationPrefs {
  quiet_start: string; // "23:00"
  quiet_end: string;   // "08:00"
  density: "short" | "detailed";
  digest_time: string; // "08:00"
  consent_given: boolean;
  consent_at: string | null;
}

export const PREFS_DEFAULTS: PersonalizationPrefs = {
  quiet_start: "23:00",
  quiet_end: "08:00",
  density: "short",
  digest_time: "08:00",
  consent_given: false,
  consent_at: null,
};

/** Read a user's prefs; missing row → defaults. Never throws. */
export async function getPrefs(userId: string): Promise<PersonalizationPrefs> {
  try {
    const { rows } = await query<Partial<PersonalizationPrefs>>(
      `SELECT quiet_start, quiet_end, density, digest_time,
              consent_given, consent_at AS consent_at
         FROM public.personalization_prefs WHERE user_id = $1`,
      [userId],
    );
    const r = rows[0];
    return {
      quiet_start: r?.quiet_start ?? PREFS_DEFAULTS.quiet_start,
      quiet_end: r?.quiet_end ?? PREFS_DEFAULTS.quiet_end,
      density: (r?.density as PersonalizationPrefs["density"]) ?? PREFS_DEFAULTS.density,
      digest_time: r?.digest_time ?? PREFS_DEFAULTS.digest_time,
      consent_given: r?.consent_given ?? false,
      consent_at: r?.consent_at ?? null,
    };
  } catch {
    return { ...PREFS_DEFAULTS };
  }
}

export async function setPrefs(
  userId: string,
  patch: Partial<Pick<PersonalizationPrefs, "quiet_start" | "quiet_end" | "density" | "digest_time">>,
): Promise<PersonalizationPrefs> {
  const cur = await getPrefs(userId);
  const next = { ...cur, ...patch };
  await query(
    `INSERT INTO public.personalization_prefs
       (user_id, quiet_start, quiet_end, density, digest_time)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE
       SET quiet_start = EXCLUDED.quiet_start,
           quiet_end   = EXCLUDED.quiet_end,
           density     = EXCLUDED.density,
           digest_time = EXCLUDED.digest_time,
           updated_at  = now()`,
    [userId, next.quiet_start, next.quiet_end, next.density, next.digest_time],
  );
  await auditPersonalizationUpdate(userId, patch);
  return next;
}

export async function setReviewConsent(userId: string): Promise<void> {
  await query(
    `INSERT INTO public.personalization_prefs (user_id, consent_given, consent_at)
     VALUES ($1, TRUE, now())
     ON CONFLICT (user_id) DO UPDATE
       SET consent_given = TRUE, consent_at = now() WHERE NOT consent_given`,
    [userId],
  );
  await auditPersonalizationUpdate(userId, { consent: true });
}

// ── quiet-hours check (the push policy's gate) ──────────────────────────

/**
 * Is now inside the user's quiet window? P0-class notifications
 * (audit-chain broken, child curfew, leave expiring, device down
 * mid-shift) are exempt — they break quiet hours by design.
 */
export function inQuietHours(
  prefs: Pick<PersonalizationPrefs, "quiet_start" | "quiet_end">,
  now: Date = new Date(),
): boolean {
  const [sh, sm] = prefs.quiet_start.split(":").map(Number);
  const [eh, em] = prefs.quiet_end.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const mins = now.getHours() * 60 + now.getMinutes();
  // Window wraps midnight (23:00 → 08:00)
  return start > end ? mins >= start || mins < end : mins >= start && mins < end;
}

// ── block-level continuity ("same as yesterday") ──────────────────────

import { createHash } from "crypto";

export function hashBlockPayload(payload: unknown): string {
  const stable = JSON.stringify(
    payload,
    Object.keys((payload ?? {}) as object).sort(),
  );
  return createHash("sha256").update(stable).digest("hex").slice(0, 16);
}

export async function markBlockSeen(
  userId: string,
  blockKey: string,
  payload: unknown,
): Promise<{ changed: boolean; lastPayload: unknown | null }> {
  const hash = hashBlockPayload(payload);
  const { rows } = await query<{ last_seen_hash: string; last_payload: unknown }>(
    `SELECT last_seen_hash, last_payload FROM public.attendance_seen
      WHERE user_id = $1 AND block_key = $2`,
    [userId, blockKey],
  );
  const prev = rows[0];
  const changed = !prev || prev.last_seen_hash !== hash;
  await query(
    `INSERT INTO public.attendance_seen (user_id, block_key, last_seen_hash, last_payload)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, block_key) DO UPDATE
       SET last_seen_hash = EXCLUDED.last_seen_hash,
           last_payload   = EXCLUDED.last_payload,
           last_seen_at   = now()`,
    [userId, blockKey, hash, JSON.stringify(payload)],
  );
  return { changed, lastPayload: prev?.last_payload ?? null };
}

// ── audit (all prefs changes land in the tamper-evident chain) ────────
import { recordMutationAudit } from "@/middleware/entityAuthorization";

async function auditPersonalizationUpdate(userId: string, patch: Record<string, unknown>): Promise<void> {
  try {
    await recordMutationAudit({
      actorId: userId,
      roleContext: "self",
      action: "personalization_update",
      resource: "personalization_prefs",
      resourceId: userId,
      afterState: patch,
    });
  } catch {
    // audit is best-effort here; prefs are already persisted
  }
}
