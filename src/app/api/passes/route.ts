import { NextRequest, NextResponse } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { findGatePasses, createGatePass, getParentChildren } from "@/lib/db";
import { supabase, getSupabaseServiceClient } from "@/lib/dbClient";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { validatePassRequestPayload } from "@/lib/validation";
import { checkIdempotency, storeIdempotency } from "@/lib/idempotency";
import type { AuthContext } from "@/lib/authContext";
import type { Student, GatePass } from "@/lib/types";
import { createCase, linkCaseToRecord } from "@/lib/institutional/cases";
import { generateAttention } from "@/lib/institutional/attention";
import { getValidHostelCodes } from "@/server/repositories/hostel/codes";

const ADMIN_ROLES = ["admin", "sysadmin", "operator", "principal", "supervisor", "principal"];

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const authUserId = auth.userId;
    const authRole = auth.role;

    const params = req.nextUrl.searchParams;
    const status = params.get("status") || undefined;
    let roll = params.get("roll") || undefined;
    let parentId = params.get("parentId") || undefined;

    // Authorization: non-admin roles may only query their own data.
    const isAdmin = ADMIN_ROLES.includes(authRole);

    if (!isAdmin) {
      if (authRole === 'student') {
        // Students must query by their own roll number, which we can get from their user profile.
        const service = getSupabaseServiceClient();
        const { data: profile } = await service
          .from('users')
          .select('unique_id')
          .eq('id', authUserId)
          .maybeSingle();

        const userRoll = profile?.unique_id;
        if (!userRoll) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "No roll number associated with this account." } },
            { status: 403 }
          );
        }
        if (roll && roll !== userRoll) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "You can only view your own passes." } },
            { status: 403 }
          );
        }
        roll = userRoll;
      } else if (authRole === 'parent' || authRole === 'guardian') {
        if (parentId && parentId !== authUserId) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "You can only view your children's passes." } },
            { status: 403 }
          );
        }
        parentId = authUserId;
      } else if (authRole === 'visitor') {
        // Visitors can list the pass records they were granted today — they
        // don't own a roll number, so they query by their own user id.
        parentId = authUserId;
      } else {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions." } },
          { status: 403 }
        );
      }
    }

    // Warden/supervisor scoping: limit how many passes they can pull and
    // optionally filter by hostel block.
    let limit: number | undefined;
    if (authRole === "principal" || authRole === "supervisor") {
      limit = Math.min(parseInt(params.get("limit") || "200", 10), 500);
      const hostel = params.get("hostel");
      if (hostel) {
        // Live, DB-derived hostel block codes — a new block is valid
        // automatically. Legacy roll alias "ME" normalizes to "MECH".
        const probe = hostel.toUpperCase() === "ME" ? "MECH" : hostel.toUpperCase();
        const valid = await getValidHostelCodes();
        if (!valid.has(probe)) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "INVALID_FILTER",
                message:
                  valid.size === 0
                    ? "No hostel blocks are configured yet."
                    : `Unknown hostel block '${hostel}'. Available: ${[...valid].join(", ")}`,
              },
            },
            { status: 400 }
          );
        }
      }
    }

    const passes = await findGatePasses({ status, roll, parentId, limit });

    let data: GatePass[] = passes;
    if ((authRole === "principal" || authRole === "supervisor") && params.get("hostel")) {
      const hostel = params.get("hostel")!.toUpperCase();
      const service = getSupabaseServiceClient();
      const rolls = data.map((p) => p.roll).filter(Boolean);
      const { data: details } = await service
        .from("student_details")
        .select("roll, hostel_block")
        .in("roll", rolls.length ? rolls : ["__none__"]);
      const blockByRoll = new Map((details || []).map((d: any) => [String(d.roll).toUpperCase(), d.hostel_block?.toUpperCase()]));
      data = data.filter((p) => blockByRoll.get(p.roll?.toUpperCase() ?? "") === hostel);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching passes:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load passes" } },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const requestedById = auth.userId;
    const authRole = auth.role;
    const authUserId = auth.userId;

    const idempotencyKey = req.headers.get("idempotency-key") || req.headers.get("x-idempotency-key");
    const cached = await checkIdempotency(idempotencyKey, auth.userId, "/api/passes");
    if (cached.cached) {
      return NextResponse.json(cached.responseBody, { status: cached.statusCode || 200 });
    }

    const body = await req.json().catch(() => null);
    const validation = validatePassRequestPayload(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PAYLOAD", message: validation.error || "Invalid request body" } },
        { status: 400 }
      );
    }
    const { roll, reason, from, to, description } = body;

    if (!roll || !reason || !from || !to) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "roll, reason, from, to are required" } },
        { status: 400 }
      );
    }

    if (reason === 'day_pass') {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (fromDate.getFullYear() !== toDate.getFullYear() || fromDate.getMonth() !== toDate.getMonth() || fromDate.getDate() !== toDate.getDate()) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_DATES", message: "Day Pass return time must be on the same calendar day as departure. Use Home Out for overnight leave." } },
          { status: 400 }
        );
      }
    }

    // Validate that the user is authorized to create a pass for this roll
    if (authRole === 'student') {
      // Student can only create passes for themselves
      const { data: profile } = await supabase
        .from('users')
        .select('unique_id')
        .eq('id', authUserId)
        .single();

      if (profile?.unique_id !== roll) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "You can only create passes for yourself." } },
          { status: 403 }
        );
      }
    } else if (authRole === 'parent' || authRole === 'guardian') {
      // Parent/guardian can only create passes for their children
      const children = await getParentChildren(authUserId);
      const childRolls = children.map((c: Student) => c.roll);
      if (!childRolls.includes(roll)) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "You can only create passes for your children." } },
          { status: 403 }
        );
      }
    } else if (!['admin', 'sysadmin', 'operator'].includes(authRole)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions to create a pass." } },
        { status: 403 }
      );
    }

    const pass = await createGatePass({
      roll,
      reason,
      from,
      to,
      description,
      requestedById,
      isParentRequest: authRole === 'parent' || authRole === 'guardian',
    });

    if (!pass) {
      // Distinguish "user exists but profile row missing" from "roll unknown".
      const { data: userExists } = await supabase
        .from('users')
        .select('id')
        .eq('unique_id', roll)
        .maybeSingle();
      if (userExists) {
        return NextResponse.json(
          { success: false, error: { code: "STUDENT_PROFILE_MISSING", message: "Your student profile is not set up. Contact admin." } },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: { code: "STUDENT_NOT_FOUND", message: "No student with this roll number found" } },
        { status: 404 }
      );
    }

    // PR-13 (gate-pass migration, step 1 of 2): every gate pass is now
    // ALSO a GATE_PASS case on the universal case layer. The pass row
    // remains the source of truth for the pass itself; the case is the
    // institutional tracking record that a decision (approve/reject)
    // moves. This is additive — the old path is untouched, so a
    // migration failure here cannot break pass creation.
    try {
      const durationMs = new Date(to ?? 0).getTime() - new Date(from ?? 0).getTime();
      const durationDays = Number.isFinite(durationMs) ? Math.max(0, Math.ceil(durationMs / 86_400_000)) : 0;
      const c = await createCase({
        type: "gate_pass",
        subjectType: "student",
        subjectId: roll,
        origin: "gate_pass_request",
        risk: durationDays > 3 ? "MEDIUM" : "LOW",
        payload: {
          reason,
          duration_days: durationDays,
        },
        actor: {
          id: auth.userId,
          name: auth.email,
          role: auth.role,
          roleContext: "administrative",
        },
      });
      const passId = (pass as { id?: string }).id;
      if (c && passId) {
        await linkCaseToRecord(c.id, "gate_pass", passId, {
          id: auth.userId,
          name: auth.email,
          role: auth.role,
          roleContext: "administrative",
        });
      }
    } catch (caseErr) {
      // The case layer must never break pass creation.
      console.error("gate_pass case link failed:", caseErr);
    }

    const payload = { success: true, data: pass };
    if (idempotencyKey) {
      await storeIdempotency(idempotencyKey, auth.userId, "/api/passes", payload, 200);
    }
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error creating pass:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create pass" } },
      { status: 500 }
    );
  }
}

// Read-only list. Kept generous: this is a cheap GET that every student page
// load re-fires, and on the shared-IP server the per-IP bucket is burned
// quickly by normal traffic + tooling. A tight 100/min cap caused real users
// to see the list 429 ("glitching / stuck at login"). Raise the read budget
// high; the POST mutation limiter (passes_create, 10/min) stays strict.
export const GET = withApiChain(handleGet, {
  route: "/api/passes",
  auth: "user",
  requiredRole: ['admin', 'sysadmin', 'operator', 'parent', 'guardian', 'student', 'supervisor', 'principal', 'visitor'],
  rateLimit: { keyPrefix: 'passes_list', maxRequests: 1000, windowMs: 60_000 },
});

export const POST = withMutationGuard(handlePost, {requiredRole: ['student', 'parent', 'guardian', 'admin', 'sysadmin', 'operator'], rateLimit: { keyPrefix: 'passes_create', maxRequests: 10 }});
