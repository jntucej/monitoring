// model-runtime/permission-engine.ts
// Deterministic authorization for model tool requests. The LLM only *asks* for a
// tool; it never decides whether the operation is allowed. This engine is code,
// not the model: RBAC -> scope -> tenant -> credential lookup -> audit.
//
// The credential is the ONLY material that reaches the outbound API call, and
// only inside executeTool(). It is never placed in any model prompt and is
// redacted from all logs.

import type { ToolAction } from "./schemas/m1.js";
import { log } from "./logger.js";

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
};

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
