import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { sanitizeAgentPayload } from "./redactor";
import { canInvokeAgentTool } from "../../../model-runtime/permission-engine";

export type AgentToolName =
  | "get_pending_items"
  | "get_unnoted_circulars"
  | "explain_workflow_status"
  | "draft_action";

export interface DraftActionCard {
  kind: "draft_action";
  action_type: "circular_noted" | "circular_decide" | "circular_remind" | "circular_relay" | "workflow_transition";
  title: string;
  summary: string;
  target_ref: string;
  endpoint: string;
  method: "POST";
  payload: Record<string, unknown>;
  requires_confirmation: true;
  approval_chain: string[];
}

export interface AgentToolResult {
  tool: AgentToolName;
  ok: boolean;
  data: unknown;
  draft?: DraftActionCard;
}

export async function getPendingItems(auth: AuthContext): Promise<unknown> {
  const [circularRes, workflowRes] = await Promise.all([
    query<{
      title: string;
      circular_no: string | null;
      deadline: string | null;
      action_required: boolean;
      staff_duty_required: boolean;
      faculty_relay_required: boolean;
    }>(
      `SELECT c.title, c.circular_no, c.deadline,
              c.action_required, c.staff_duty_required, c.faculty_relay_required
         FROM public.circular_requests c
         JOIN public.campus_feed_receipts r
           ON r.feed_id = c.feed_item_id AND r.user_id = $1::uuid
        WHERE c.status = 'published'
          AND r.noted_at IS NULL
        ORDER BY c.action_required DESC, c.deadline ASC NULLS LAST
        LIMIT 15`,
      [auth.userId],
    ).catch(() => ({ rows: [] })),
    query<{
      id: string;
      workflow_key: string | null;
      current_stage: string | null;
      status: string | null;
      updated_at: string | null;
    }>(
      `SELECT wi.id, wi.workflow_key, wi.current_stage, wi.status, wi.updated_at
         FROM public.workflow_instances wi
        WHERE wi.status IN ('pending', 'in_review', 'awaiting_approval')
          AND (wi.assigned_role = $1 OR wi.requester_id = $2::uuid)
        ORDER BY wi.updated_at DESC NULLS LAST
        LIMIT 15`,
      [auth.role, auth.userId],
    ).catch(() => ({ rows: [] })),
  ]);

  return sanitizeAgentPayload(
    {
      role: auth.role,
      unnoted_circulars_count: circularRes.rows.length,
      unnoted_circulars: circularRes.rows,
      pending_workflows_count: workflowRes.rows.length,
      pending_workflows: workflowRes.rows,
    },
    auth.role,
  );
}

export async function getUnnotedCirculars(auth: AuthContext): Promise<unknown> {
  const { rows } = await query<{
    id: string;
    title: string;
    circular_no: string | null;
    issued_by: string | null;
    deadline: string | null;
    action_required: boolean;
    faculty_relay_required: boolean;
    staff_duty_required: boolean;
  }>(
    `SELECT c.id, c.title, c.circular_no, c.issued_by, c.deadline,
            c.action_required, c.faculty_relay_required, c.staff_duty_required
       FROM public.circular_requests c
       JOIN public.campus_feed_receipts r
         ON r.feed_id = c.feed_item_id AND r.user_id = $1::uuid
      WHERE c.status = 'published'
        AND r.noted_at IS NULL
      ORDER BY c.action_required DESC, c.deadline ASC NULLS LAST
      LIMIT 25`,
    [auth.userId],
  ).catch(() => ({ rows: [] }));

  return sanitizeAgentPayload(
    {
      role: auth.role,
      count: rows.length,
      items: rows.map((r) => ({
        circular_no: r.circular_no ?? "CIRCULAR",
        title: r.title,
        issued_by: r.issued_by,
        deadline: r.deadline,
        action_required: r.action_required || r.faculty_relay_required || r.staff_duty_required,
      })),
    },
    auth.role,
  );
}

export async function explainWorkflowStatus(
  auth: AuthContext,
  targetRef?: string,
): Promise<unknown> {
  const ref = (targetRef ?? "").trim();
  if (!ref) {
    return sanitizeAgentPayload(
      {
        status: "no_target",
        explanation: "Specify a circular number, pass reference, or workflow key to inspect its current stage and blockers.",
      },
      auth.role,
    );
  }

  const { rows: circRows } = await query<{
    title: string;
    circular_no: string | null;
    status: string;
    deadline: string | null;
    issued_by: string | null;
  }>(
    `SELECT title, circular_no, status, deadline, issued_by
       FROM public.circular_requests
      WHERE circular_no ILIKE $1 OR title ILIKE $2
      ORDER BY created_at DESC
      LIMIT 3`,
    [ref, `%${ref}%`],
  ).catch(() => ({ rows: [] }));

  if (circRows.length > 0) {
    const c = circRows[0];
    return sanitizeAgentPayload(
      {
        kind: "circular",
        reference: c.circular_no ?? c.title,
        title: c.title,
        status: c.status,
        deadline: c.deadline,
        issued_by: c.issued_by,
        next_step:
          c.status === "published"
            ? "Recipients must mark Noted (and relay if faculty_relay_required)."
            : `Awaiting approval/publication (current status: ${c.status}).`,
      },
      auth.role,
    );
  }

  return sanitizeAgentPayload(
    {
      kind: "workflow",
      reference: ref,
      status: "not_found_in_scope",
      explanation: `No active circular or workflow matching "${ref}" was found within your ${auth.role} scope.`,
    },
    auth.role,
  );
}

export function buildDraftAction(
  auth: AuthContext,
  params: {
    action_type: DraftActionCard["action_type"];
    target_ref: string;
    title?: string;
    summary?: string;
    payload?: Record<string, unknown>;
  },
): DraftActionCard {
  const endpointMap: Record<DraftActionCard["action_type"], string> = {
    circular_noted: `/api/circulars/${encodeURIComponent(params.target_ref)}/noted`,
    circular_decide: `/api/circulars/${encodeURIComponent(params.target_ref)}/decide`,
    circular_remind: `/api/circulars/${encodeURIComponent(params.target_ref)}/remind`,
    circular_relay: `/api/circulars/${encodeURIComponent(params.target_ref)}/relay`,
    workflow_transition: `/api/workflows/${encodeURIComponent(params.target_ref)}/transition`,
  };

  return sanitizeAgentPayload(
    {
      kind: "draft_action",
      action_type: params.action_type,
      title: params.title ?? `Proposed ${params.action_type.replace("_", " ")}`,
      summary: params.summary ?? `Prepared by agent for ${auth.role} confirmation.`,
      target_ref: params.target_ref,
      endpoint: endpointMap[params.action_type],
      method: "POST",
      payload: params.payload ?? {},
      requires_confirmation: true,
      approval_chain: [auth.role],
    },
    auth.role,
  );
}

export async function executeAgentTool(
  auth: AuthContext,
  tool: AgentToolName,
  args: Record<string, unknown> = {},
): Promise<AgentToolResult> {
  if (!canInvokeAgentTool(auth.role, tool)) {
    return {
      tool,
      ok: false,
      data: { error: "FORBIDDEN", message: `Role ${auth.role} is not permitted to invoke ${tool}.` },
    };
  }

  switch (tool) {
    case "get_pending_items":
      return { tool, ok: true, data: await getPendingItems(auth) };
    case "get_unnoted_circulars":
      return { tool, ok: true, data: await getUnnotedCirculars(auth) };
    case "explain_workflow_status":
      return {
        tool,
        ok: true,
        data: await explainWorkflowStatus(auth, typeof args.target_ref === "string" ? args.target_ref : undefined),
      };
    case "draft_action": {
      const actionType = (args.action_type as DraftActionCard["action_type"]) ?? "circular_noted";
      const targetRef = typeof args.target_ref === "string" ? args.target_ref : "pending";
      const draft = buildDraftAction(auth, {
        action_type: actionType,
        target_ref: targetRef,
        title: typeof args.title === "string" ? args.title : undefined,
        summary: typeof args.summary === "string" ? args.summary : undefined,
        payload: (args.payload as Record<string, unknown>) ?? {},
      });
      return { tool, ok: true, data: draft, draft };
    }
  }
}
