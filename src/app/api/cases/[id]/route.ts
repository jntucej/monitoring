// src/app/api/cases/[id]/route.ts
//
// PR-02 — Case Engine API surface (single case + its event stream).
//
//   GET  /api/cases/:id           the case row + its full event stream
//   GET  /api/cases/:id/events    only the event stream (cheaper)
//   POST /api/cases/:id/events    append an event to the case stream
//
// Reads are open to any authenticated role (cases are institutional);
// writes to the event stream require a case-writer role. The case layer
// has no domain-specific code here — the authority question ("may this
// actor act on this case type?") is answered by PR-04's authority engine,
// not by this route.

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/middleware/authorization";
import { withRateLimit, type RateLimitConfig } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";
import { ok, fail } from "@/server/http/response";
import { getCase, addCaseEvent } from "@/lib/institutional/cases";
import { query } from "@/lib/postgres";
import type { Actor } from "@/lib/institutional/contracts";
import type { AuthContext } from "@/lib/authContext";

const WRITE_ROLES: AuthContext["role"][] = [
  "principal", "vice_principal", "admin", "sysadmin",
  "hod", "oie", "exam_branch", "exam_superintendent",
  "deputy_warden", "hostel_manager", "caretaker",
  "supervisor", "operator", "faculty", "staff", "emo",
];

const getLimit: RateLimitConfig = { ...RATE_LIMITS.read, keyPrefix: "cases_get" };
const postLimit: RateLimitConfig = { ...RATE_LIMITS.mutation, keyPrefix: "cases_events" };

// ── GET /api/cases/:id  and  /api/cases/:id/events ────────────────────────

async function implGet(req: NextRequest) {
  const auth = await getAuthenticatedUser(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean); // ['api','cases',':id'] or [.., ':id','events']
  const id = segments[2] ?? "";
  const wantsEventsOnly = segments[3] === "events";
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return fail("BAD_REQUEST", "Case id must be a uuid", 400);
  }

  try {
    if (wantsEventsOnly) {
      const { rows } = await query<{
        event: string;
        detail: Record<string, unknown>;
        role_context: string | null;
        created_at: string;
      }>(
        `SELECT event, detail, role_context, created_at
           FROM public.case_events
          WHERE case_id = $1
          ORDER BY created_at ASC
          LIMIT 200`,
        [id],
      );
      return ok({ events: rows });
    }

    const c = await getCase(id);
    if (!c) return fail("NOT_FOUND", "Case not found", 404);
    return ok({ case: c });
  } catch (e) {
    return fail("INTERNAL", e instanceof Error ? e.message : "Failed to load case", 500);
  }
}

// ── POST /api/cases/:id/events ────────────────────────────────────────────

async function implPost(req: NextRequest) {
  const auth = await getAuthenticatedUser(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 },
    );
  }
  if (!WRITE_ROLES.includes(auth.role)) {
    return fail("FORBIDDEN", "Role may not append case events", 403);
  }

  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  // /api/cases/:id/events → segments [ 'api', 'cases', ':id', 'events' ]
  const id = segments[2] ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return fail("BAD_REQUEST", "Case id must be a uuid", 400);
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.event !== "string") {
    return fail("BAD_REQUEST", "Required: event (string), detail (object, optional)", 400);
  }

  const actor: Actor = {
    id: auth.userId,
    name: auth.email,
    role: auth.role,
    roleContext: (body.role_context as Actor["roleContext"]) ?? "administrative",
  };

  try {
    await addCaseEvent(id, body.event, (body.detail ?? {}) as Record<string, unknown>, actor);
    return ok({ ok: true, event: body.event }, 201);
  } catch (e) {
    return fail("INTERNAL", e instanceof Error ? e.message : "Failed to append case event", 500);
  }
}

export const GET = withRateLimit(implGet, getLimit);
export const POST = withRateLimit(implPost, postLimit);
