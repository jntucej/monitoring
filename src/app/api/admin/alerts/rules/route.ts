import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getAlertRules, createAlertRule, toggleAlertRule, getAlertHistory } from "@/lib/alerting";
import { addAudit } from "@/lib/db";
import { Role } from "@/lib/types";

async function handleGet() {
  try {
    const rules = await getAlertRules();
    const history = await getAlertHistory();
    return NextResponse.json({ success: true, data: { rules, history } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, metric, threshold, durationMinutes, severity, channel } = body;

    if (!name || !metric || threshold === undefined) {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Missing required rule attributes." } }, { status: 400 });
    }

    const created = await createAlertRule({
      name,
      metric,
      threshold: Number(threshold),
      durationMinutes: Number(durationMinutes || 5),
      severity: severity || "warning",
      channel: channel || "opsgenie",
      enabled: true,
    });

    const actorId = req.headers.get("x-user-id") || "sysadmin";
    const actorRole = (req.headers.get("x-user-role") || "sysadmin") as Role;

    /* await addAudit({
      action: "ALERT_RULE_CREATE",
      userId: actorId,
      userName: "SysAdmin",
      role: actorRole,
      details: `Created operational alert rule '${name}' for metric '${metric}'.`,
    }); */

    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

async function handlePatch(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, enabled } = body;
    const updated = await toggleAlertRule(id, Boolean(enabled));
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] });
export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin"] });
export const PATCH = withAuthorization(handlePatch, { requiredRole: ["sysadmin"] });
