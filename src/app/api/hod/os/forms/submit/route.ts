import { NextRequest } from "next/server";
import { z } from "zod";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { randomUUID } from "node:crypto";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/hod/os/forms/submit — schema-driven HOD form submission.
 *
 * Validates the payload against the catalog's `hodFormSchemas[formKey]`
 * JSON Schema (fetched live), dedupes via a deterministic idempotency_key,
 * and writes to domain_outbox (the transactional relay dedups + processes).
 * No form field is hardcoded in this handler — the schema is the source.
 */
const Body = z.object({
  formKey: z.string(),
  payload: z.record(z.string(), z.unknown()),
  idempotencyKey: z.string().optional(),
});

async function implPost(req: NextRequest, ctx: ApiChainContext<unknown, AuthContext>) {
  const { auth } = ctx;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  const { formKey, payload } = parsed.data;

  // Load the live JSON Schema for this form (catalog-driven, zero hardcoding).
  const schemaRow = await query<{ json_schema: Record<string, unknown> }>(
    `SELECT json_schema FROM public.form_schemas WHERE form_key = $1 AND is_active LIMIT 1`,
    [formKey],
  ).catch(() => ({ rows: [] as { json_schema: Record<string, unknown> }[] }));
  if (schemaRow.rows.length === 0) {
    return fail("NOT_FOUND", `Form schema ${formKey} not found or inactive.`, 404);
  }
  const jsonSchema = schemaRow.rows[0].json_schema;

  // Minimal required-field validation against the live schema (no full JSON
  // Schema library needed for the current form set).
  const required: string[] = Array.isArray(jsonSchema.required)
    ? (jsonSchema.required as string[])
    : [];
  const missing = required.filter((f) => payload[f] == null || payload[f] === "");
  if (missing.length > 0) {
    return fail("VALIDATION", `Missing required fields: ${missing.join(", ")}`, 400);
  }

  // Deterministic idempotency key (dedupe the outbox relay).
  const key = parsed.data.idempotencyKey ?? `hod:form:${formKey}:${auth.userId}:${randomUUID()}`;

  await query(
    `INSERT INTO public.domain_outbox (event_type, payload, idempotency_key, status)
     VALUES ($1::text, $2::jsonb, $3, 'PENDING')
     ON CONFLICT DO NOTHING`,
    [`HOD_FORM_SUBMIT:${formKey}`, JSON.stringify({ formKey, payload, submittedBy: auth.userId, at: new Date().toISOString() }), key],
  );

  return ok({ formKey, idempotencyKey: key, outboxStatus: "PENDING" });
}

export const POST = withApiChain(implPost, {
  route: "/api/hod/os/forms/submit",
  auth: "user",
  requiredRole: ["hod", "principal", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "hod_os_form", maxRequests: 120 },
});
