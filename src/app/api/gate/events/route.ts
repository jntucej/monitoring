import { NextRequest, NextResponse } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { errMsg } from "@/lib/err-msg";
import { withAuthorization } from "@/middleware/authorization";
import { getBlueprint, getRefCategories, type GateEventType, type GateContext } from "@/lib/gate/blueprints";
import { recordGateEvent, GateValidationError } from "@/lib/gate/events";

/**
 * GET /api/gate/events?role=&gateType=&eventType=&context=
 *   → { blueprint: FieldBlueprint[] }
 *
 * The operator form calls this to learn which fields to render for the
 * current role / gate / event.
 */
async function handleGet(req: NextRequest, ctx: { auth: AuthContext }) {
  const sp = req.nextUrl.searchParams;
  const role = sp.get("role") ?? ctx.auth.role;
  const gateType = (sp.get("gateType") ?? "main") as "main" | "hostel" | "exam" | "vehicle" | "service";
  const eventType = sp.get("eventType");
  const context = sp.get("context") ?? "default";

  if (!eventType) {
    return NextResponse.json(
      { success: false, error: "eventType is required" },
      { status: 400 }
    );
  }

  try {
    const blueprint = await getBlueprint({
      role,
      gateType,
      eventType: eventType as GateEventType,
      context: context as GateContext,
    });
    // Load the ref_categories for any premade domains so the form can render
    // dropdowns in one round-trip.
    const domains = [
      ...new Set(
        blueprint.filter((f) => f.fillMode === "premade" && f.refDomain).map((f) => f.refDomain!)
      ),
    ];
    const refOptions = await getRefCategories(domains);
    return NextResponse.json({ blueprint, refOptions });
  } catch (e) {
    return NextResponse.json({ success: false, error: errMsg(e) }, { status: 500 });
  }
}

/**
 * POST /api/gate/events
 *   body: { gateId, gateType, eventType, context?, deviceId?, shiftId?,
 *           direction?, subjectType?, subjectId?, subjectRef?, payload }
 *   → 201 { event, blueprint, derived }
 *   → 400 { error }  on validation / unknown premade code
 *
 * The recorder validates against the role's blueprint, runs the 10 automation
 * rules, persists to the correct per-type table, and streams to the existing
 * /api/gate/stream SSE bus.
 */
async function handlePost(req: NextRequest, ctx: { auth: AuthContext }) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const result = await recordGateEvent({
      role: ctx.auth.role,
      gateId: String(body.gateId ?? ctx.auth.gateId ?? ""),
      gateType: (body.gateType as "main" | "hostel" | "exam" | "vehicle" | "service") ?? "main",
      eventType: body.eventType as "movement" | "visitor" | "pass" | "exception" | "security" | "device" | "shift" | "vehicle" | "exam_access" | "hostel_gate",
      context: (body.context as "default" | "exam_day" | "lockdown" | "curfew_window" | "night_shift") ?? "default",
      deviceId: (body.deviceId as string | undefined) ?? null,
      operatorId: ctx.auth.userId,
      shiftId: (body.shiftId as string | undefined) ?? null,
      direction: (body.direction as "IN" | "OUT" | "NA" | undefined) ?? "NA",
      subjectType: body.subjectType as string | undefined,
      subjectId: (body.subjectId as string | undefined) ?? null,
      subjectRef: (body.subjectRef as string | undefined) ?? null,
      isManual: Boolean(body.isManual ?? false),
      payload: (body.payload as Record<string, unknown>) ?? {},
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof GateValidationError) {
      return NextResponse.json({ success: false, error: e.message }, { status: 400 });
    }
    console.error("[gate/events] recordGateEvent failed", errMsg(e));
    return NextResponse.json({ success: false, error: errMsg(e) }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, {
  requiredRole: [
    "operator",
    "supervisor",
    "deputy_warden",
    "exam_superintendent",
    "oie",
    "admin",
    "sysadmin",
  ],
});

export const POST = withAuthorization(handlePost, {
  requiredRole: [
    "operator",
    "supervisor",
    "deputy_warden",
    "exam_superintendent",
    "oie",
    "admin",
    "sysadmin",
  ],
});
