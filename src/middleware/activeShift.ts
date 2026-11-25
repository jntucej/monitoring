import { NextRequest, NextResponse } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";

export type ShiftNeed = "gate_scan" | "visitor_checkin" | "sos_respond";

export interface ActiveShiftInfo {
  shift_id: string;
  assignment_id: string;
  post_id: string;
  kind: string;
  gate_id: string | null;
}

export type ActiveShiftContext = {
  auth: AuthContext;
  activeShift?: ActiveShiftInfo;
};

export function withActiveShift<C extends ActiveShiftContext>(
  handler: (req: NextRequest, ctx: C) => Promise<Response>,
  opts: {
    need: ShiftNeed;
    gateFrom?: "body" | "query" | "params";
    /** When true, only enforce for role === 'operator' (supervisors/admins bypass). */
    operatorOnly?: boolean;
  },
) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    if (opts.operatorOnly && ctx.auth.role !== "operator") {
      return handler(req, ctx);
    }

    const { rows } = await query<ActiveShiftInfo>(
      `SELECT sh.id AS shift_id,
              spa.id AS assignment_id,
              sp.id AS post_id,
              sp.kind,
              cl.gate_id
         FROM public.security_shifts sh
         JOIN public.shift_post_assignments spa
           ON spa.shift_id = sh.id AND spa.operator_id = $1::uuid
         JOIN public.security_posts sp ON sp.id = spa.post_id
         LEFT JOIN public.campus_locations cl ON cl.id = sp.location_id
        WHERE sh.status IN ('published', 'active')
          AND NOW() BETWEEN sh.starts_at AND sh.ends_at
          AND spa.status = 'checked_in'
        LIMIT 1`,
      [ctx.auth.userId],
    );

    if (!rows.length) {
      await addAudit({
        action: "SHIFT_ACCESS_DENIED",
        userId: ctx.auth.userId,
        role: ctx.auth.role,
        details: { reason: "no_active_shift", need: opts.need },
      }).catch(() => {});
      return NextResponse.json({ error: "no_active_shift" }, { status: 403 });
    }

    const s = rows[0];

    if (opts.need === "gate_scan") {
      if (s.kind !== "gate" || !s.gate_id) {
        await addAudit({
          action: "SHIFT_ACCESS_DENIED",
          userId: ctx.auth.userId,
          role: ctx.auth.role,
          details: { reason: "post_not_gate", postKind: s.kind },
        }).catch(() => {});
        return NextResponse.json({ error: "post_not_gate" }, { status: 403 });
      }

      let requestedGate: string | null = null;
      if (opts.gateFrom === "body") {
        const body = await req.clone().json().catch(() => null);
        requestedGate = (body?.gate_id ?? body?.gateId ?? null) as string | null;
      } else if (opts.gateFrom === "query") {
        requestedGate =
          req.nextUrl.searchParams.get("gate_id") ??
          req.nextUrl.searchParams.get("gateId");
      }

      if (requestedGate && requestedGate !== s.gate_id) {
        await addAudit({
          action: "SHIFT_ACCESS_DENIED",
          userId: ctx.auth.userId,
          role: ctx.auth.role,
          details: { reason: "wrong_gate", assignedGate: s.gate_id, requestedGate },
        }).catch(() => {});
        return NextResponse.json({ error: "wrong_gate" }, { status: 403 });
      }
    } else if (opts.need === "sos_respond") {
      if (!["gate", "patrol", "sos_only"].includes(s.kind)) {
        return NextResponse.json({ error: "post_cannot_respond" }, { status: 403 });
      }
    }

    ctx.activeShift = s;
    return handler(req, ctx);
  };
}
