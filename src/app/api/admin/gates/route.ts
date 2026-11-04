import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withAdminMutation } from "@/server/http/mutation-guard";
import { addAudit } from "@/lib/db";
import { RATE_LIMITS } from "@/config/app-constants";
import type { RateLimitConfig } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

/**
 * GET  /api/admin/gates — list all gates (admin/sysadmin).
 * POST /api/admin/gates — create a gate (admin/sysadmin, audit GATE_CREATED).
 */

const SENTINEL_GATE_ID = "00000000-0000-0000-0000-000000000000";

const readLimit: RateLimitConfig = { ...RATE_LIMITS.read, keyPrefix: "admin_gates_list" };

async function handleGet(_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const res = await query<{
      id: string;
      gate_code: string;
      name: string;
      location: string;
      type: string;
      is_active: boolean;
      audience: string | null;
      created_at: string;
    }>(
      `SELECT id, gate_code, name, location, type, is_active, audience, created_at
         FROM public.gates
        ORDER BY gate_code`
    );

    return NextResponse.json({
      success: true,
      data: res.rows.map((g) => ({
        id: g.id,
        gateCode: g.gate_code,
        name: g.name,
        location: g.location,
        type: g.type,
        isActive: g.is_active,
        audience: g.audience,
        createdAt: g.created_at,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const gateCode = typeof body.gateCode === "string" ? body.gateCode.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const location = typeof body.location === "string" ? (body.location.trim() || "Campus") : "Campus";
    const type = typeof body.type === "string" && body.type.trim() ? body.type.trim() : "standard";
    const audience = typeof body.audience === "string" && body.audience.trim() ? body.audience.trim() : "all";

    if (!gateCode) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_BODY", message: "gateCode is required" } },
        { status: 400 }
      );
    }

    if (gateCode.toUpperCase() === "UNKNOWN") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SENTINEL_PROTECTED",
            message: "The system sentinel gate 'UNKNOWN' cannot be created or modified.",
          },
        },
        { status: 403 }
      );
    }

    const exists = await query<{ id: string }>(
      `SELECT id FROM public.gates WHERE gate_code = $1 LIMIT 1`,
      [gateCode]
    );
    if (exists.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "GATE_CODE_EXISTS", message: `gateCode '${gateCode}' is already in use.` },
        },
        { status: 409 }
      );
    }

    const actorId = ctx.auth.userId;
    const actorRole = ctx.auth.role as Role;

    const res = await query<{
      id: string;
      gate_code: string;
      name: string;
      location: string;
      type: string;
      is_active: boolean;
      audience: string | null;
    }>(
      `INSERT INTO public.gates (gate_code, name, location, type, audience, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, gate_code, name, location, type, is_active, audience`,
      [gateCode, name || gateCode, location, type, audience]
    );

    const gate = res.rows[0];
    if (!gate) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: "Failed to create gate" } },
        { status: 500 }
      );
    }

    await addAudit({
      action: "GATE_CREATED",
      userId: actorId,
      userName: ctx.auth.email,
      role: actorRole,
      details: `Created gate ${gate.gate_code} (${gate.id})`,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: gate.id,
          gateCode: gate.gate_code,
          name: gate.name,
          location: gate.location,
          type: gate.type,
          isActive: gate.is_active,
          audience: gate.audience,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  readLimit
);

export const POST = withAdminMutation(handlePost, { rateLimit: readLimit });
