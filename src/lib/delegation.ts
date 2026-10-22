import { query } from "@/lib/postgres";
import type { WorkflowType } from "@/lib/types";

export interface DelegationInput {
  workflowType: WorkflowType;
  reason: string;
  durationHours: number | null;
  distanceKm: number | null;
  isLocal: boolean;
}

export type ApprovalTier =
  | { kind: "delegate_autonomous"; delegateRole: string; notifyRole: string | null; ruleName: string }
  | { kind: "principal_mandatory"; ruleName: string }
  | { kind: "no_rule"; defaultRole: "principal" };

export async function resolveApprovalTier(input: DelegationInput): Promise<ApprovalTier> {
  const { rows } = await query<any>(
    `SELECT name, delegate_role, notification_only_role,
            max_duration_hours, max_distance_km, local_only, requires_principal
       FROM public.delegation_rules
      WHERE workflow_type = $1 AND is_active = TRUE
        AND (reason IS NULL OR reason = $2)
      ORDER BY priority ASC`,
    [input.workflowType, input.reason],
  );

  for (const r of rows) {
    if (r.max_duration_hours != null && (input.durationHours ?? 0) > r.max_duration_hours) continue;
    if (r.max_distance_km != null && (input.distanceKm ?? 0) > r.max_distance_km) continue;
    if (r.local_only && !input.isLocal) continue;
    if (r.requires_principal) return { kind: "principal_mandatory", ruleName: r.name };
    return {
      kind: "delegate_autonomous",
      delegateRole: r.delegate_role,
      notifyRole: r.notification_only_role,
      ruleName: r.name,
    };
  }

  return { kind: "no_rule", defaultRole: "principal" };
}

export function isMessBillExempt(dep: Date, h = 6, m = 0): boolean {
  return dep.getHours() < h || (dep.getHours() === h && dep.getMinutes() < m);
}
