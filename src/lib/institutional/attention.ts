// src/lib/institutional/attention.ts
//
// PR-09 — Executive Attention Engine. Continuously watches institutional
// events (gate, hostel, academic, exam, complaint, security, workflow,
// SLA) and compresses them into a severity-ranked "what needs a
// principal decision" list. The Executive Cockpit (PR-12) is a thin view
// over these rows — it does NOT re-derive the attention, it reads it.
//
// Compose, don't fork: attention_items.source_kind + source_id reference
// escalation / sla / decision / lockdown / incident rows by id. The
// engine links, never duplicates. An item is actionable until resolved
// or expired.

import { query } from "@/lib/postgres";
import { logAuditEvent } from "@/lib/audit";
import type {
  Actor,
  AttentionItem,
  AttentionSeverity,
} from "@/lib/institutional/contracts";

// ── Severity ranking (pure, exported for tests + PR-12) ─────────────────

export const SEVERITY_RANK: Record<AttentionSeverity, number> = {
  INFO: 0,
  WARNING: 1,
  CRITICAL: 2,
};

/**
 * A true Array.sort comparator for the attention queue: highest severity
 * first (CRITICAL → WARNING → INFO). Within a severity the caller adds
 * created_at DESC as the tiebreaker.
 */
export function severityOrder(a: AttentionSeverity, b: AttentionSeverity): number {
  return SEVERITY_RANK[a] - SEVERITY_RANK[b];
}

// ── Generate ──────────────────────────────────────────────────────────────

export interface GenerateAttentionInput {
  severity: AttentionSeverity;
  title: string;
  detail: string;
  /** escalation | sla | decision | lockdown | incident | case. */
  sourceKind: string;
  sourceId: string;
  caseId?: string | null;
  recommendedAction?: string | null;
  expiresAt?: Date | string | null;
  actor?: Actor;
}

export interface AttentionItemRow {
  id: string;
  severity: AttentionSeverity;
  title: string;
  detail: string;
  source_kind: string;
  source_id: string;
  case_id: string | null;
  recommended_action: string | null;
  expires_at: string | null;
  resolved: boolean;
  created_at: string;
}

/**
 * Generate an attention item. Called by:
 *   - the escalation engine (PR-05) when a case escalates to the
 *     principal's authority
 *   - the SLA sweeper when a due_at passes (SLA_BREACH)
 *   - a risk jump (a LOW → HIGH case)
 *   - an emergency command (PR-10) landing on the queue as CRITICAL
 *   - a delegation expiring (MEDIUM "delegation expiring tomorrow")
 *
 * The item is what the principal sees, not the raw event. It is
 * compressed: a count + a baseline delta + a deadline + a recommended
 * action.
 */
export async function generateAttention(
  input: GenerateAttentionInput,
): Promise<AttentionItemRow> {
  // De-dupe: an identical unresolvable item for the same source is not
  // re-inserted (the principal is not re-flooded with the same item).
  const { rows: existing } = await query<{ id: string }>(
    `SELECT id FROM public.attention_items
      WHERE source_kind = $1 AND source_id = $2 AND resolved = FALSE
      LIMIT 1`,
    [input.sourceKind, input.sourceId],
  );
  if (existing.length > 0) return {
    id: existing[0].id,
    severity: input.severity,
    title: input.title,
    detail: input.detail,
    source_kind: input.sourceKind,
    source_id: input.sourceId,
    case_id: input.caseId ?? null,
    recommended_action: input.recommendedAction ?? null,
    expires_at: input.expiresAt instanceof Date ? input.expiresAt.toISOString() : (input.expiresAt ?? null),
    resolved: false,
    created_at: new Date().toISOString(),
  };

  const { rows } = await query<AttentionItemRow>(
    `INSERT INTO public.attention_items
       (severity, title, detail, source_kind, source_id, case_id,
        recommended_action, expires_at, resolved)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, FALSE)
     RETURNING *`,
    [
      input.severity,
      input.title,
      input.detail,
      input.sourceKind,
      input.sourceId,
      input.caseId ?? null,
      input.recommendedAction ?? null,
      input.expiresAt instanceof Date ? input.expiresAt.toISOString() : (input.expiresAt ?? null),
    ],
  );
  const item = rows[0];

  await logAuditEvent({
    action: "attention.generated",
    userId: input.actor?.id ?? "system",
    userName: input.actor?.name ?? "system",
    userRole: input.actor?.role ?? "system",
    details: { item: item.id, severity: item.severity, title: item.title },
  } as any);

  return item;
}

// ── Resolve / list ────────────────────────────────────────────────────────

/** Resolve an attention item (the principal acted on it). */
export async function resolveAttention(itemId: string, actor: Actor): Promise<AttentionItemRow> {
  const { rows } = await query<AttentionItemRow>(
    `UPDATE public.attention_items SET resolved = TRUE, resolved_by = $2, resolved_at = now()
      WHERE id = $1 AND resolved = FALSE
     RETURNING *`,
    [itemId, actor.id],
  );
  if (rows.length === 0) throw new Error(`attention item ${itemId} not found or already resolved`);
  await logAuditEvent({
    action: "attention.resolved",
    userId: actor.id,
    userName: actor.name ?? actor.id,
    userRole: actor.role,
    details: { item: itemId },
  } as any);
  return rows[0];
}

/** The active attention queue (CRITICAL → WARNING → INFO, newer first). */
export async function attentionQueue(limit: number = 50): Promise<AttentionItemRow[]> {
  const { rows } = await query<AttentionItemRow>(
    `SELECT * FROM public.attention_items
      WHERE resolved = FALSE
        AND (expires_at IS NULL OR expires_at > now())
      ORDER BY
        CASE severity WHEN 'CRITICAL' THEN 0 WHEN 'WARNING' THEN 1 ELSE 2 END,
        created_at DESC
      LIMIT $1`,
    [limit],
  );
  return rows;
}

/** Hydrate a PR-01 AttentionItem from a row (the UI shape). */
export function toAttentionItem(row: AttentionItemRow): AttentionItem {
  // The source_kind → link.kind mapping: the attention engine's source
  // kinds (escalation / sla / decision / lockdown / incident / case)
  // are the PR-01 link kinds plus 'sla'/'incident' (which the UI opens
  // as a case). The cast is safe: every source_kind is a valid link kind
  // or maps to 'case'.
  const kind = (row.source_kind === "sla" || row.source_kind === "incident")
    ? "case"
    : row.source_kind;
  return {
    severity: row.severity,
    title: row.title,
    detail: row.detail,
    link: { kind: kind as AttentionItem["link"] extends { kind: infer K } ? K : never, id: row.source_id },
    recommendedAction: row.recommended_action ?? undefined,
    expiresAt: row.expires_at,
  };
}
