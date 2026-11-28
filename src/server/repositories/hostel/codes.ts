import { query } from "@/lib/postgres";

/**
 * Live, DB-derived set of valid hostel-block codes (the distinct
 * non-empty `student_details.hostel_block` values). Never a hardcoded list —
 * a newly added block becomes valid automatically.
 *
 * Cached for the process lifetime (blocks are rare to change). On query
 * failure we fall back to an EMPTY set so callers surface "invalid / unknown"
 * rather than accepting an arbitrary value — callers must handle the empty
 * set as "no blocks configured" instead of treating it as a real allowlist.
 */
let cache: { codes: Set<string>; fetchedAt: number } | null = null;
const TTL_MS = 5 * 60_000;

export async function getValidHostelCodes(): Promise<Set<string>> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) return cache.codes;
  try {
    const { rows } = await query<{ block: string }>(
      `SELECT DISTINCT btrim(sd.hostel_block) AS block
         FROM public.student_details sd
        WHERE sd.hostel_block IS NOT NULL AND btrim(sd.hostel_block) <> ''
        ORDER BY 1`,
    );
    const codes = new Set(
      rows.map((r) => r.block.toUpperCase()).filter((c) => c.length > 0),
    );
    cache = { codes, fetchedAt: Date.now() };
    return codes;
  } catch {
    // Do not return a stale or hardcoded fallback as "valid" — return empty
    // so the caller rejects the unknown code with a clear message.
    return new Set<string>();
  }
}
