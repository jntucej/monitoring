/**
 * Rules engine — read ops_rules (the versioned operational-threshold store).
 *
 * Every automation reads thresholds from here instead of hard-coding them:
 * curfew windows, leave-duration classes, meal cutoffs, attendance minimums,
 * confirmation chains, notification-scope grants. A new effective_from row
 * supersedes the prior one; the active rule is the most-recent effective_from
 * whose effective_to is NULL or in the future.
 */
import { query } from "@/lib/postgres";

export interface OpsRule {
  id: string;
  domain: string;
  ruleKey: string;
  scope: string | null;
  value: Record<string, unknown>;
  effectiveFrom: string;
  effectiveTo: string | null;
  version: number;
}

/**
 * Return the active value for (domain, ruleKey). `scope` may be a specific
 * scope (e.g. 'dept:CSE'); if not found, falls back to the global (NULL
 * scope) rule. Returns null if no rule matches.
 */
export async function getRule<T = Record<string, unknown>>(
  domain: string,
  ruleKey: string,
  scope?: string | null
): Promise<T | null> {
  // Specific scope first, then global fallback.
  const candidates = scope
    ? [scope, null]
    : [null];

  for (const s of candidates) {
    const { rows } = await query<OpsRule>(
      `SELECT id, domain,
              rule_key       AS "ruleKey",
              scope,
              value,
              effective_from AS "effectiveFrom",
              effective_to   AS "effectiveTo",
              version
         FROM public.ops_rules
        WHERE domain = $1
          AND rule_key = $2
          AND ($3::text IS NULL OR scope = $3::text)
          AND (effective_to IS NULL OR effective_to > now())
        ORDER BY effective_from DESC
        LIMIT 1`,
      [domain, ruleKey, s]
    );
    if (rows.length > 0) return rows[0].value as T;
  }
  return null;
}

/** List all active rules for a domain (optional scope filter). */
export async function listRules(
  domain: string,
  scope?: string | null
): Promise<OpsRule[]> {
  const { rows } = await query<OpsRule>(
    `SELECT id, domain,
            rule_key       AS "ruleKey",
            scope,
            value,
            effective_from AS "effectiveFrom",
            effective_to   AS "effectiveTo",
            version
       FROM public.ops_rules
      WHERE domain = $1
        AND (effective_to IS NULL OR effective_to > now())
        AND ($2::text IS NULL OR scope = $2::text)
      ORDER BY rule_key, effective_from DESC`,
    [domain, scope ?? null]
  );
  return rows;
}

/**
 * Create a new version of a rule (closes the prior effective row). Called by
 * POST /api/rules. The new row becomes active immediately.
 */
export async function setRule(
  domain: string,
  ruleKey: string,
  value: Record<string, unknown>,
  scope: string | null,
  createdById: string
): Promise<OpsRule> {
  // Close any currently-active row for the same (domain, key, scope).
  await query(
    `UPDATE public.ops_rules
        SET effective_to = now(), version = version + 1
      WHERE domain = $1 AND rule_key = $2 AND ($3::text IS NULL OR scope = $3::text)
        AND effective_to IS NULL`,
    [domain, ruleKey, scope]
  );
  const { rows } = await query<OpsRule>(
    `INSERT INTO public.ops_rules
       (domain, rule_key, scope, value, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, domain, rule_key AS "ruleKey", scope, value,
               effective_from AS "effectiveFrom", effective_to AS "effectiveTo", version`,
    [domain, ruleKey, scope, JSON.stringify(value), createdById]
  );
  return rows[0];
}
