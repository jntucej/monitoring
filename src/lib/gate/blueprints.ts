/**
 * Gate Records — field-blueprint resolver.
 *
 * The operator / gate UI does NOT hard-code which fields each role sees. It
 * asks the DB for the (role, gate_type, event_type, context) field list from
 * `gate_field_blueprints` and renders from that. `premade` fields are
 * dropdowns sourced from `ref_categories`; `auto`/`derived` fields are
 * read-only (the server computes them — the client never supplies them).
 *
 * This module is the control-plane half of the gate-records subsystem. The
 * data half (recordGateEvent + the 10 automation rules) is in ./events.ts.
 */
import { query } from "@/lib/postgres";

export type FillMode =
  | "auto"
  | "scan"
  | "premade"
  | "capture"
  | "required"
  | "optional"
  | "derived";

export type GateEventType =
  | "movement"
  | "visitor"
  | "pass"
  | "exception"
  | "security"
  | "device"
  | "shift"
  | "vehicle"
  | "exam_access"
  | "hostel_gate";

export type GateType = "main" | "hostel" | "exam" | "vehicle" | "service";
export type GateContext =
  | "default"
  | "exam_day"
  | "lockdown"
  | "curfew_window"
  | "night_shift";

export interface FieldBlueprint {
  fieldKey: string;
  label: string;
  fillMode: FillMode;
  refDomain: string | null;
  recordTarget: string;
  required: boolean;
  sortOrder: number;
  validation: Record<string, unknown>;
  visibleWhen: Record<string, unknown>;
}

export interface RefCategory {
  domain: string;
  code: string;
  label: string;
  sortOrder: number;
  metadata: Record<string, unknown>;
}

export interface BlueprintKey {
  role: string;
  gateType: GateType;
  eventType: GateEventType;
  context?: GateContext;
}

// Module-scoped cache. Blueprints change only via migration (active rows +
// version bump), so a short-lived in-process cache is safe and keeps the
// kiosk form off the DB on every keystroke.
const cache = new Map<string, FieldBlueprint[]>();
const cacheTtlMs = 60_000;
const cacheTimes = new Map<string, number>();

const keyOf = (k: BlueprintKey) =>
  `${k.role}|${k.gateType}|${k.eventType}|${k.context ?? "default"}`;

/**
 * Resolve the ordered, active field list for a role/gate/event. Falls back to
 * the `default` context when a specific context has no blueprint.
 */
export async function getBlueprint(
  k: BlueprintKey
): Promise<FieldBlueprint[]> {
  const context = (k.context ?? "default") as string;
  const ck = keyOf(k);
  const hit = cache.get(ck);
  if (hit && Date.now() - (cacheTimes.get(ck) ?? 0) < cacheTtlMs) {
    return hit;
  }

  const rows = await query<FieldBlueprint>(
    `SELECT field_key    AS "fieldKey",
            label,
            fill_mode    AS "fillMode",
            ref_domain   AS "refDomain",
            record_target AS "recordTarget",
            required,
            sort_order   AS "sortOrder",
            COALESCE(validation, '{}')  AS validation,
            COALESCE(visible_when, '{}') AS "visibleWhen"
       FROM public.gate_field_blueprints
      WHERE role = $1
        AND gate_type = $2
        AND event_type = $3
        AND context = $4
        AND active
      ORDER BY sort_order`,
    [k.role, k.gateType, k.eventType, context]
  );

  let list = rows.rows;
  // Context fallback: a specific context (e.g. 'curfew_window') may not have a
  // blueprint of its own — fall back to the 'default' one for that event type.
  if (list.length === 0 && context !== "default") {
    const fallback = await query<FieldBlueprint>(
      `SELECT field_key    AS "fieldKey",
              label,
              fill_mode    AS "fillMode",
              ref_domain   AS "refDomain",
              record_target AS "recordTarget",
              required,
              sort_order   AS "sortOrder",
              COALESCE(validation, '{}')  AS validation,
              COALESCE(visible_when, '{}') AS "visibleWhen"
         FROM public.gate_field_blueprints
        WHERE role = $1
          AND gate_type = $2
          AND event_type = $3
          AND context = 'default'
          AND active
        ORDER BY sort_order`,
      [k.role, k.gateType, k.eventType]
    );
    list = fallback.rows;
  }

  cache.set(ck, list);
  cacheTimes.set(ck, Date.now());
  return list;
}

/**
 * Load the active codes + labels for one or more ref_categories domains in a
 * single round-trip. Powers the `premade` dropdowns in the operator form.
 */
export async function getRefCategories(
  domains: string[]
): Promise<Record<string, RefCategory[]>> {
  if (domains.length === 0) return {};
  const rows = await query<RefCategory>(
    `SELECT domain,
            code,
            label,
            sort_order AS "sortOrder",
            COALESCE(metadata, '{}') AS metadata
       FROM public.ref_categories
      WHERE domain = ANY($1::text[])
        AND active
      ORDER BY domain, sort_order`,
    [domains]
  );
  const out: Record<string, RefCategory[]> = {};
  for (const r of rows.rows) {
    (out[r.domain] ??= []).push(r);
  }
  return out;
}

/** Drop the blueprint cache (call after a blueprint migration, if needed). */
export function invalidateBlueprintCache(): void {
  cache.clear();
  cacheTimes.clear();
}
