// /api/cron/complaint-triage/route.ts
// Phase 1 agent #3 — Complaint triage (bounded to supervisor scope).
// Runs every 30 min (cron). For each open complaint lacking a category
// or owner, the agent classifies (keyword match → T1/T2/T3), routes to
// the role with matching scope, flags duplicates, and escalates SLA
// breaches. It NEVER closes complaints — only routes and flags.

import { errMsg } from "@/lib/err-msg";
import { NextRequest } from "next/server";
import { requireCronAuth } from "@/server/http/cron-auth";
import { query } from "@/lib/postgres";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

/** Keyword → category + priority classifier (Phase 1: rule-based;
 *  Phase 2 swaps in the LLM path). */
function classify(text: string): { category: string; priority: string } {
  const t = text.toLowerCase();
  if (/gate|scan|pass|entry|exit|biometric/.test(t)) {
    return { category: "GATE", priority: "HIGH" };
  }
  if (/mess|food|meal|token|menu/.test(t)) {
    return { category: "MESS", priority: "MEDIUM" };
  }
  if (/hostel|room|warden|curfew|block/.test(t)) {
    return { category: "HOSTEL", priority: "MEDIUM" };
  }
  if (/exam|result|mark|hall ticket|admit/.test(t)) {
    return { category: "EXAM", priority: "HIGH" };
  }
  if (/fee|dues|payment|receipt/.test(t)) {
    return { category: "ACCOUNTS", priority: "MEDIUM" };
  }
  if (/electricity|water|building|maintenance|broken/.test(t)) {
    return { category: "MAINTENANCE", priority: "LOW" };
  }
  return { category: "GENERAL", priority: "LOW" };
}

/** Map category → the role that owns it (route target). */
const CATEGORY_OWNER: Record<string, string> = {
  GATE: "supervisor",
  MESS: "mess_incharge",
  HOSTEL: "hostel_manager",
  EXAM: "oie",
  ACCOUNTS: "admin",
  MAINTENANCE: "caretaker",
  GENERAL: "supervisor",
};

export async function POST(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  try {
    // Open complaints without a category assigned yet.
    const { rows } = await query<{
      id: string; title: string; description: string;
      category_code: string | null;
      current_owner_role: string | null;
      sla_deadline: string | null;
      on_behalf_of_scope: string | null;
      on_behalf_of_id: string | null;
    }>(
      `SELECT id, title, description, category_code,
              current_owner_role, sla_deadline,
              on_behalf_of_scope, on_behalf_of_id
         FROM public.complaints
        WHERE status = 'submitted'
          AND deleted_at IS NULL
        ORDER BY created_at ASC
        LIMIT 100`,
    );

    let categorized = 0;
    let routed = 0;
    let slaEscalated = 0;
    let dupFlagged = 0;

    for (const comp of rows) {
      const text = `${comp.title} ${comp.description}`;
      const { category, priority } = classify(text);

      // 1. Categorize if missing.
      if (!comp.category_code) {
        await query(
          `UPDATE public.complaints
              SET category_code = $1, priority = $2
            WHERE id = $3`,
          [category, priority, comp.id],
        );
        categorized += 1;
      }

      // 2. Route to the owning role if unowned.
      const ownerRole = CATEGORY_OWNER[category];
      if (!comp.current_owner_role && ownerRole) {
        await query(
          `UPDATE public.complaints
              SET current_owner_role = $1
            WHERE id = $2`,
          [ownerRole, comp.id],
        );
        routed += 1;
      }

      // 3. Flag duplicates: same title (lowercased, trimmed) + same
      //    filer scope, created within 7 days. Only flag — do not close.
      const dup = await query<{ n: string }>(
        `SELECT COUNT(*)::text AS n
           FROM public.complaints c2
          WHERE c2.id <> $1
            AND LOWER(TRIM(c2.title)) = LOWER(TRIM($2))
            AND c2.on_behalf_of_scope = $3
            AND c2.created_at > now() - INTERVAL '7 days'
            AND c2.deleted_at IS NULL`,
        [comp.id, comp.title, comp.on_behalf_of_scope],
      );
      if (Number(dup.rows[0].n || 0) > 0) {
        await query(
          `UPDATE public.complaints
              SET visible_to_roles = array_append(COALESCE(visible_to_roles, '{}'::text[]), 'supervisor')
            WHERE id = $1 AND NOT (visible_to_roles @> ARRAY['supervisor'])`,
          [comp.id],
        ).catch(() => undefined); // column shape may vary; never block
        dupFlagged += 1;
      }

      // 4. SLA breach escalation (deduplicated: at most 1 unresolved alert per complaint).
      if (comp.sla_deadline && new Date(comp.sla_deadline).getTime() < Date.now()) {
        await query(
          `INSERT INTO public.alerts (severity, resource_type, title, detail, created_by)
           SELECT 'high', 'complaint_sla', $1, $2, NULL
            WHERE NOT EXISTS (
              SELECT 1 FROM public.alerts
               WHERE resource_type = 'complaint_sla' AND title = $1 AND resolved = false
            )`,
          [comp.id, `Complaint SLA breached: ${comp.title}`],
        ).catch(() => undefined);
        slaEscalated += 1;
      }
    }

    await recordMutationAudit({
      actorId: "00000000-0000-0000-0000-000000000000",
      actorType: "agent",
      roleContext: "supervisor",
      action: "complaint_triage",
      resource: "complaints",
      afterState: { processed: rows.length, categorized, routed, dupFlagged, slaEscalated },
    });

    return Response.json({
      success: true,
      processed: rows.length,
      categorized, routed, dupFlagged, slaEscalated,
    });
  } catch (err) {
    return Response.json({ success: false, error: errMsg(err) }, { status: 500 });
  }
}
