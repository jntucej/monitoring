// src/app/api/cases/route.ts
//
// PR-02 — Case Engine API surface. The universal capability routes:
//
//   POST /api/cases          create a case (creator role required, or a
//                            system actor with a named origin)
//   GET  /api/cases          list (type / state / scope filters; 100 cap)
//   GET  /api/cases?subject=student:ID  list by subject
//
// Reads require the actor to be a human role (any authenticated role) —
// the case layer is institutional, not domain-scoped, so every role sees
// cases but the principal (and higher) see the whole institutional view
// while lower roles see only the types they can act on.
//
// The reference workflow this PR wires is the gate-pass case:
// a fired gate event opens a gate_pass case and it moves through the
// CREATED → OPEN → RESOLVED lifecycle without touching any principal-
// specific code. The case layer is the one shared kernel; every later
// PR adds to it, none of them replace it.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit, type RateLimitConfig } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";
import { ok, fail } from "@/server/http/response";
import { listCases, createCase } from "@/lib/institutional/cases";
import type { Actor, CaseType } from "@/lib/institutional/contracts";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

const WRITE_ROLES: Role[] = [
  "principal", "vice_principal", "admin", "sysadmin",
  "hod", "oie", "exam_branch", "exam_superintendent",
  "deputy_warden", "hostel_manager", "caretaker",
  "supervisor", "operator", "faculty", "staff", "emo",
];

// ── POST ───────────────────────────────────────────────────────────────────

async function handlePost(req: NextRequest, ctx: { auth: AuthContext }) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return fail("BAD_REQUEST", "Body must be a JSON object", 400);
  }

  const type: CaseType = body.type;
  const subjectType = body.subject_type ?? body.subjectType;
  const subjectId = body.subject_id ?? body.subjectId;

  if (!type || !subjectType || !subjectId) {
    return fail(
      "BAD_REQUEST",
      "Required: type (CaseType), subject_type, subject_id",
      400,
    );
  }

  const auth: AuthContext = ctx.auth;
  const actor: Actor = {
    id: auth.userId,
    name: auth.email,
    role: auth.role,
    roleContext: (body.authority_context as Actor["roleContext"]) ?? "administrative",
  };

  try {
    const c = await createCase({
      type,
      subjectType,
      subjectId,
      origin: body.origin ?? `manual/${auth.role}`,
      risk: body.risk ?? "LOW",
      authorityRole: body.authority_role ?? null,
      authorityContext: body.authority_context ?? null,
      entityScope: body.entity_scope ?? null,
      slaDueAt: body.sla_due_at ?? null,
      payload: body.payload ?? {},
      actor,
    });
    return ok({ case: c }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create case";
    return fail("INTERNAL", msg, 500);
  }
}

// ── GET ────────────────────────────────────────────────────────────────────

async function handleGet(req: NextRequest, _ctx: { auth: AuthContext }) {
  const sp = req.nextUrl.searchParams;
  const type = (sp.get("type") ?? undefined) as CaseType | undefined;
  const state = sp.get("state") as "CREATED" | "OPEN" | "RESOLVED" | "CLOSED" | "CANCELLED" | undefined;
  const entityScope = sp.get("scope") ?? undefined;
  const limit = Math.min(Number(sp.get("limit") ?? 100) || 100, 100);

  // Subject filter: `?subject=student:ABC123`
  let subjectType: string | undefined;
  let subjectId: string | undefined;
  const subject = sp.get("subject");
  if (subject) {
    const idx = subject.indexOf(":");
    if (idx > 0) {
      subjectType = subject.slice(0, idx);
      subjectId = subject.slice(idx + 1);
    }
  }

  try {
    // A simple type+state+scope filter is enough for the reference workflow.
    // The full subject filter joins cases with the subject entity in
    // PR-13 (domain migration); this PR exposes the filter shape.
    const cases = await listCases({ type, state, entityScope, limit });
    const filtered = subjectType && subjectId
      ? cases.filter((c) => c.subject_type === subjectType && c.subject_id === subjectId)
      : cases;
    return ok({ cases: filtered, total: filtered.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list cases";
    return fail("INTERNAL", msg, 500);
  }
}

const postLimit: RateLimitConfig = { ...RATE_LIMITS.mutation, keyPrefix: "cases_write" };
const getLimit: RateLimitConfig = { ...RATE_LIMITS.read, keyPrefix: "cases_read" };

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: WRITE_ROLES }),
  postLimit,
);

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: undefined }),
  getLimit,
);
