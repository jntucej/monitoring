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
 * GET    /api/admin/gates/schedule — gate open/close windows per day-of-week
 *          (public.gate_schedules joined with public.gates).
 * POST   /api/admin/gates/schedule — create a schedule window (audit GATE_UPDATED).
 * PATCH  /api/admin/gates/schedule — update an existing window via { id } or
 *          { gateId, dayOfWeek } (audit GATE_UPDATED).
 */

const readLimit: RateLimitConfig = { ...RATE_LIMITS.read, keyPrefix: "admin_gate_schedule" };

interface ScheduleBody {
  gateId?: string;
  gate_id?: string;
  dayOfWeek?: number;
  day_of_week?: number;
  openTime?: string;
  open_time?: string;
  closeTime?: string;
  close_time?: string;
  isActive?: boolean;
  is_active?: boolean;
  id?: string;
}

function timeOk(t: unknown): boolean {
  return typeof t === "string" && /^\d{1,2}:\d{2}(:\d{2})?$/.test(t);
}

function dayOk(d: unknown): boolean {
  return typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6;
}

async function handleGet(_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const res = await query<{
      id: string;
      gate_id: string | null;
      gate_code: string | null;
      gate_name: string | null;
      day_of_week: number;
      open_time: string;
      close_time: string;
      is_active: boolean;
    }>(
      `SELECT s.id, s.gate_id, g.gate_code, g.name AS gate_name,
              s.day_of_week, s.open_time, s.close_time, s.is_active
         FROM public.gate_schedules s
         LEFT JOIN public.gates g ON g.id = s.gate_id
        ORDER BY COALESCE(g.gate_code, ''), s.day_of_week, s.open_time`
    );

    const schedules = res.rows.map((s) => ({
      id: s.id,
      gateId: s.gate_id,
      gateCode: s.gate_code,
      gateName: s.gate_name,
      dayOfWeek: s.day_of_week,
      openTime: s.open_time,
      closeTime: s.close_time,
      isActive: s.is_active,
    }));

    // Group per gate for convenience
    const byGate = new Map<string, typeof schedules>();
    for (const s of schedules) {
      const key = s.gateId || "ungated";
      const list = byGate.get(key) ?? [];
      list.push(s);
      byGate.set(key, list);
    }

    return NextResponse.json({ success: true, data: { schedules, byGate: Object.fromEntries(byGate) } });
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
    const body = (await req.json().catch(() => ({}))) as ScheduleBody;
    const gateId = body.gateId ?? body.gate_id ?? null;
    const day = body.dayOfWeek ?? body.day_of_week;
    const openTime = (body.openTime ?? body.open_time ?? "06:00") as string;
    const closeTime = (body.closeTime ?? body.close_time ?? "22:00") as string;

    if (!dayOk(day) || !timeOk(openTime) || !timeOk(closeTime)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_BODY",
            message: "dayOfWeek (0-6), openTime and closeTime (HH:MM) are required and must be valid.",
          },
        },
        { status: 400 }
      );
    }

    const res = await query<{
      id: string;
      gate_id: string | null;
      day_of_week: number;
      open_time: string;
      close_time: string;
      is_active: boolean;
    }>(
      `INSERT INTO public.gate_schedules (gate_id, day_of_week, open_time, close_time, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, gate_id, day_of_week, open_time, close_time, is_active`,
      [gateId ? gateId : null, day, openTime, closeTime]
    );
    const row = res.rows[0];

    await addAudit({
      action: "GATE_UPDATED",
      userId: ctx.auth.userId,
      userName: ctx.auth.email,
      role: ctx.auth.role as Role,
      details: `Created gate schedule window ${row.id} (gate=${gateId ?? "ALL"}, day=${day}, ${openTime}-${closeTime})`,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: row.id,
          gateId: row.gate_id,
          dayOfWeek: row.day_of_week,
          openTime: row.open_time,
          closeTime: row.close_time,
          isActive: row.is_active,
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

async function handlePatch(req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const body = (await req.json().catch(() => ({}))) as ScheduleBody;

    const patch: Record<string, unknown> = {};
    if (dayOk(body.dayOfWeek ?? body.day_of_week)) patch.day_of_week = body.dayOfWeek ?? body.day_of_week;
    if (timeOk(body.openTime ?? body.open_time)) patch.open_time = body.openTime ?? body.open_time;
    if (timeOk(body.closeTime ?? body.close_time)) patch.close_time = body.closeTime ?? body.close_time;
    if (typeof (body.isActive ?? body.is_active) === "boolean") {
      patch.is_active = body.isActive ?? body.is_active;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "BAD_REQUEST", message: "No updatable fields provided (id or gateId+dayOfWeek plus openTime/closeTime/isActive)." },
        },
        { status: 400 }
      );
    }

    let where = "";
    const values: unknown[] = [];
    if (body.id) {
      where = "s.id = $1";
      values.push(body.id);
    } else {
      if (!body.gateId && !body.gate_id) {
        return NextResponse.json(
          { success: false, error: { code: "BAD_REQUEST", message: "Provide schedule id, or gateId with dayOfWeek." } },
          { status: 400 }
        );
      }
      where = "s.gate_id = $1 AND s.day_of_week = $2";
      values.push(body.gateId ?? body.gate_id, body.dayOfWeek ?? body.day_of_week);
    }
    const cols = Object.entries(patch).map(([i, col]) => `"${col}" = $${i + values.length + 1}`).join(", ");
    const params = [...values, ...Object.values(patch)];

    const res = await query<{
      id: string;
      gate_id: string | null;
      day_of_week: number;
      open_time: string;
      close_time: string;
      is_active: boolean;
    }>(
      `UPDATE public.gate_schedules s SET ${cols}
          WHERE ${where}
         RETURNING s.id, s.gate_id, s.day_of_week, s.open_time, s.close_time, s.is_active`,
      params
    );
    const row = res.rows[0];

    if (!row) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "No matching gate schedule window found." } },
        { status: 404 }
      );
    }

    await addAudit({
      action: "GATE_UPDATED",
      userId: ctx.auth.userId,
      userName: ctx.auth.email,
      role: ctx.auth.role as Role,
      details: `Updated gate schedule window ${row.id} (gate=${row.gate_id ?? "ALL"}, day=${row.day_of_week}): ${JSON.stringify(patch)}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        gateId: row.gate_id,
        dayOfWeek: row.day_of_week,
        openTime: row.open_time,
        closeTime: row.close_time,
        isActive: row.is_active,
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
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  readLimit
);

export const POST = withAdminMutation(handlePost, { rateLimit: readLimit });

export const PATCH = withAdminMutation(handlePatch, { rateLimit: readLimit });
