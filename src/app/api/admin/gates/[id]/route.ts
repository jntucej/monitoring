import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { addAudit } from "@/lib/db";
import { RATE_LIMITS } from "@/config/app-constants";
import type { RateLimitConfig } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

/**
 * GET  /api/admin/gates/[id] — fetch a single gate by id (sysadmin).
 * PATCH /api/admin/gates/[id] — toggle is_active and/or update name/location/type (sysadmin).
 */

const adminLimit: RateLimitConfig = { ...RATE_LIMITS.admin, keyPrefix: "admin_gates" };

function getId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1]);
}

async function handleGet(req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const id = getId(req);
    const res = await query<{
      id: string;
      gate_code: string;
      name: string;
      location: string;
      type: string;
      is_active: boolean;
      latitude: number | null;
      longitude: number | null;
      allowed_radius_meters: number | null;
    }>(
      `SELECT id, gate_code, name, location, type, is_active,
              latitude, longitude, allowed_radius_meters
         FROM public.gates WHERE id = $1`,
      [id]
    );

    const gate = res.rows[0];
    if (!gate) {
      return NextResponse.json(
        { success: false, error: { code: "GATE_NOT_FOUND", message: `Gate ${id} not found.` } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: gate.id,
        gateCode: gate.gate_code,
        name: gate.name,
        location: gate.location,
        type: gate.type,
        isActive: gate.is_active,
        latitude: gate.latitude,
        longitude: gate.longitude,
        allowedRadiusMeters: gate.allowed_radius_meters,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

async function handlePatch(req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const id = getId(req);
    const body = await req.json().catch(() => ({}));
    const actorId = ctx.auth.userId;
    const actorRole = ctx.auth.role as Role;

    const patch: Record<string, unknown> = {};
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_BODY", message: "isActive must be a boolean" } },
          { status: 400 }
        );
      }
      patch.is_active = body.isActive;
    }
    if (body.name !== undefined) patch.name = body.name;
    if (body.location !== undefined) patch.location = body.location;
    if (body.type !== undefined) patch.type = body.type;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "No updatable fields provided (isActive, name, location, type)." } },
        { status: 400 }
      );
    }

    const cols = Object.entries(patch).map(([i, col]) => `"${col}" = $${i + 1}`).join(", ");
    const values = Object.values(patch);
    const res = await query<{ id: string; gate_code: string; name: string; location: string; type: string; is_active: boolean }>(
      `UPDATE public.gates SET ${cols} WHERE id = $${values.length + 1}
       RETURNING id, gate_code, name, location, type, is_active`,
      [...values, id]
    );

    const gate = res.rows[0];
    if (!gate) {
      return NextResponse.json(
        { success: false, error: { code: "GATE_NOT_FOUND", message: `Gate ${id} not found.` } },
        { status: 404 }
      );
    }

    await addAudit({
      action: "GATE_UPDATED",
      userId: actorId,
      userName: ctx.auth.email,
      role: actorRole,
      details: `Updated gate ${gate.gate_code} (${id}): ${JSON.stringify(patch)}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: gate.id,
        gateCode: gate.gate_code,
        name: gate.name,
        location: gate.location,
        type: gate.type,
        isActive: gate.is_active,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["sysadmin"] }),
  adminLimit
);

export const PATCH = withRateLimit(
  withAuthorization(handlePatch, { requiredRole: ["sysadmin"] }),
  adminLimit
);
