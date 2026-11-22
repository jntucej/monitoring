/**
 * auditTimeline — map REAL recorded audit events to PrincipalTimelineEvent.
 *
 * This is the ONLY place raw `audit_logs` rows become timeline items. It:
 *  - preserves only fields the backend actually stores (no invented fields)
 *  - dedupes by audit id (so a reconnect/refetch can't double a row)
 *  - orders deterministically (newest first, the store's canonical order)
 *  - is honest: a row with no `at`/`action` is dropped, not fabricated
 *
 * It has no knowledge of which entity the row belongs to — that binding is
 * the caller's job (the route that fetched the row scoped to the entity).
 */
import type { PrincipalTimelineEvent } from "@/lib/principal/contracts";

/** A raw `audit_logs` row as the principal audit route returns it. */
export interface AuditLogRow {
  id: string | number;
  action: string;
  user_name?: string | null;
  user_role?: string | null;
  details?: Record<string, unknown> | string | null;
  timestamp: string;
}

/**
 * Convert recorded audit rows into display events (newest first, deduped).
 * `actor`/`reason`/`auditRef` are populated only when the backend stored them.
 */
export function auditLogsToEvents(rows: AuditLogRow[]): PrincipalTimelineEvent[] {
  const seen = new Set<string>();
  const out: PrincipalTimelineEvent[] = [];
  for (const r of rows) {
    // Deterministic order: trust the store's order (newest first); a row with
    // neither an action nor a timestamp is unusable and is dropped, not faked.
    if (!r.action && !r.timestamp) continue;
    const key = String(r.id);
    if (seen.has(key)) continue;
    seen.add(key);

    const reason =
      typeof r.details === "object" && r.details != null
        ? (r.details["reason"] as string | undefined) ??
          (r.details["note"] as string | undefined)
        : typeof r.details === "string" && r.details.length > 0
          ? r.details
          : undefined;

    out.push({
      id: key,
      type: r.action,
      at: r.timestamp,
      actor:
        r.user_name != null
          ? { label: r.user_name, role: r.user_role ?? undefined }
          : undefined,
      reason,
      auditRef: key,
    });
  }
  return out;
}
