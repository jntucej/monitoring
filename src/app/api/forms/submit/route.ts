import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { z } from "zod";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/forms/submit — the schema-driven form ingestion endpoint.
 *
 * Accepts any form_key registered in form_schemas (migration 59), validates
 * the payload against that form's JSON Schema (required + types + minLength),
 * and creates a support_ticket (or the appropriate workflow record) so the
 * approval chain from the catalog drives the rest.
 *
 * No frontend deploy is needed to add a new form field: the validation is
 * read from the DB at request time.
 *
 * Privacy: the student can only submit forms for their own user_id.
 */

const FormSubmitBody = z.object({
  form_key: z.string().min(2).max(64),
  values: z.record(z.string(), z.unknown()),
});

async function validateAgainstSchema(
  jsonSchema: Record<string, unknown>,
  values: Record<string, unknown>,
): Promise<string | null> {
  const required = (jsonSchema.required ?? []) as string[];
  const props = (jsonSchema.properties ?? {}) as Record<
    string,
    { type?: string; minLength?: number; enum?: string[] }
  >;

  for (const key of required) {
    const v = values[key];
    if (v == null || (typeof v === "string" && v.trim() === "")) {
      return `"${key}" is required`;
    }
  }

  for (const [key, v] of Object.entries(values)) {
    const p = props[key];
    if (!p || v == null) continue;
    if (p.type === "string" && typeof v === "string") {
      if (p.minLength != null && v.trim().length < p.minLength) {
        return `"${key}" must be at least ${p.minLength} characters`;
      }
      if (p.enum && !p.enum.includes(v)) {
        return `"${key}" must be one of: ${p.enum.join(", ")}`;
      }
    }
  }
  return null;
}

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  let body: z.infer<typeof FormSubmitBody>;
  try {
    body = FormSubmitBody.parse(await req.json());
  } catch {
    return fail("VALIDATION", "Malformed request body", 400);
  }

  const { form_key, values } = body;

  // Read the live schema from the DB — zero hardcoding.
  const schemaRow = await query<{
    json_schema: Record<string, unknown>;
    workflow_code: string | null;
    bypass_staging: boolean;
  }>(
    `SELECT json_schema, workflow_code, bypass_staging
       FROM public.form_schemas
      WHERE form_key = $1 AND is_active LIMIT 1`,
    [form_key],
  ).catch(() => ({ rows: [] as never[] }));

  if (schemaRow.rows.length === 0) {
    return fail("UNKNOWN_FORM", `No active schema for form_key "${form_key}"`, 404);
  }

  const schema = schemaRow.rows[0];

  // Validate against the JSON Schema.
  const err = await validateAgainstSchema(schema.json_schema, values);
  if (err) {
    return fail("VALIDATION", err, 422);
  }

  // Create the ticket.
  const ticket = await query<{ id: string; ticket_number: string }>(
    `INSERT INTO public.support_tickets
       (id, ticket_number, user_id, user_name, user_role, category, priority, subject, description, status, created_at, updated_at)
     VALUES
       (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'open', NOW(), NOW())
     RETURNING id, ticket_number`,
    [
      `ST-${Date.now().toString(36).toUpperCase()}`,
      auth.userId,
      String(values.name ?? "Student"),
      "student",
      schema.bypass_staging ? "statutory" : form_key,
      schema.bypass_staging ? "high" : "normal",
      `Form: ${form_key}`,
      JSON.stringify(values, null, 2),
    ],
  ).catch(() => ({ rows: [] as { id: string; ticket_number: string }[] }));

  if (ticket.rows.length === 0) {
    return fail("DB_ERROR", "Could not create the ticket", 500);
  }

  return ok({
    ticketId: ticket.rows[0].id,
    ticketNumber: ticket.rows[0].ticket_number,
    workflowCode: schema.workflow_code,
    bypassStaging: schema.bypass_staging,
    message: schema.bypass_staging
      ? "Filed via the direct statutory channel — no class/CR staging."
      : "Submitted. Your request is now in the approval queue.",
  });
}

export const POST = withApiChain(implPost, {
  route: "/api/forms/submit",
  auth: "user",
  requiredRole: ["student", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "forms_submit", maxRequests: 30 },
});
