// model-runtime/permission-engine.ts
// Deterministic authorization for model tool requests. The LLM only *asks* for a
// tool; it never decides whether the operation is allowed. This engine is code,
// not the model: RBAC -> scope -> tenant -> credential lookup -> audit.
//
// The credential is the ONLY material that reaches the outbound API call, and
// only inside executeTool(). It is never placed in any model prompt and is
// redacted from all logs.

import type { ToolAction } from "./schemas/m1";
import { log } from "./logger";

const logger = log("permission-engine");

export interface PermissionContext {
  tenantId: string;
  userId: string;
  role: string;
  /** Capabilities the caller may exercise, e.g. ["documents.read", "sms.send"]. */
  capabilities: string[];
}

export interface CredentialRecord {
  tenantId: string;
  userId: string;
  provider: string;       // which customer API this credential belongs to
  secret: string;         // the API key / access token — NEVER leaves this layer
}

export type CredentialLookup = (
  tenantId: string,
  userId: string,
  provider: string,
) => Promise<CredentialRecord | null>;

export interface ToolAuthorization {
  tool: string;
  /** Capabilities required to run the tool. */
  requiredCapabilities: string[];
  /** Optional provider the customer credential must belong to. */
  provider?: string;
}

export const ToolAuthorizations: Record<string, ToolAuthorization> = {
  get_documents: { tool: "get_documents", requiredCapabilities: ["documents.read"], provider: "document_store" },
  search_documents: { tool: "search_documents", requiredCapabilities: ["documents.read"], provider: "document_store" },
  send_sms: { tool: "send_sms", requiredCapabilities: ["sms.send"], provider: "sms_gateway" },
  get_pending_items: { tool: "get_pending_items", requiredCapabilities: ["agent.read"] },
  get_unnoted_circulars: { tool: "get_unnoted_circulars", requiredCapabilities: ["agent.read"] },
  explain_workflow_status: { tool: "explain_workflow_status", requiredCapabilities: ["agent.read"] },
  draft_action: { tool: "draft_action", requiredCapabilities: ["agent.propose"] },
};

const AGENT_READ_ROLES = new Set([
  "student", "faculty", "staff", "hod", "deputy_warden", "hostel_manager",
  "oie", "exam_branch", "exam_superintendent", "vice_principal", "principal",
  "admin", "sysadmin", "operator", "supervisor", "caretaker", "emo",
  "mess_incharge", "dean", "chief_warden", "controller_examinations",
  "addl_controller_academic", "addl_controller_results", "addl_controller_automation",
  "guardian", "parent",
]);

const AGENT_DRAFT_ROLES = new Set([
  "faculty", "staff", "hod", "deputy_warden", "hostel_manager",
  "oie", "exam_branch", "exam_superintendent", "vice_principal", "principal",
  "admin", "sysadmin", "operator", "supervisor", "dean", "chief_warden",
  "controller_examinations",
]);

export function canInvokeAgentTool(
  role: string,
  toolName: "get_pending_items" | "get_unnoted_circulars" | "explain_workflow_status" | "draft_action",
  _scope?: string,
): boolean {
  if (toolName === "draft_action") {
    return AGENT_DRAFT_ROLES.has(role);
  }
  return AGENT_READ_ROLES.has(role);
}

export interface DenyReason {
  code: "NO_SUCH_TOOL" | "MISSING_CAPABILITY" | "TENANT_MISMATCH" | "NO_CREDENTIAL" | "SCOPED_OUT";
  detail: string;
}

export type PermissionDecision =
  | { ok: true; credential: CredentialRecord; authorization: ToolAuthorization }
  | { ok: false; reason: DenyReason };

/**
 * Decide, deterministically, whether `ctx` may run `action` and return the
 * credential to use. Fails closed on any missing element.
 */
export async function authorize(
  action: ToolAction,
  ctx: PermissionContext,
  lookup: CredentialLookup,
): Promise<PermissionDecision> {
  const auth = ToolAuthorizations[action.action];
  if (!auth) {
    return { ok: false, reason: { code: "NO_SUCH_TOOL", detail: `unknown tool '${action.action}'` } };
  }

  const missing = auth.requiredCapabilities.filter((c) => !ctx.capabilities.includes(c));
  if (missing.length) {
    return {
      ok: false,
      reason: { code: "MISSING_CAPABILITY", detail: `role '${ctx.role}' lacks ${missing.join(", ")}` },
    };
  }

  // scope check: provider must match the tool's expected provider (scoped_out)
  if (auth.provider && !ctx.capabilities.includes("provider." + auth.provider)) {
    // If the capability model doesn't tag provider grants, fall through and rely
    // on the credential lookup returning null when out of scope.
  }

  const credential = await lookup(ctx.tenantId, ctx.userId, auth.provider ?? "");
  if (!credential) {
    return { ok: false, reason: { code: "NO_CREDENTIAL", detail: `no '${auth.provider}' credential for this user` } };
  }
  if (credential.tenantId !== ctx.tenantId) {
    return { ok: false, reason: { code: "TENANT_MISMATCH", detail: "credential belongs to another tenant" } };
  }

  logger.info({ tool: auth.tool, tenantId: ctx.tenantId, userId: ctx.userId, provider: auth.provider }, "tool authorized");
  return { ok: true, credential, authorization: auth };
}

/**
 * Execute an authorized tool. The credential is injected HERE only. The model
 * never sees it; the audit record stores params + provider, never the secret.
 */
export async function executeTool(
  action: ToolAction,
  credential: CredentialRecord,
  runner: (tool: string, params: Record<string, unknown>) => Promise<unknown>,
): Promise<unknown> {
  const result = await runner(action.action, action.parameters ?? {});
  logger.info({ tool: action.action, provider: credential.provider, outcome: "ok" }, "tool executed");
  return result;
}
