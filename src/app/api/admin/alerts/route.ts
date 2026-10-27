// src/app/api/admin/alerts/route.ts
// Admin-facing alerts: GET unresolved + recently-resolved, POST to resolve.
//
// GET ?includeResolved=false|true
//   - Unresolved alerts (most recent first) plus, when includeResolved=true,
//     alerts resolved within the last 7 days so admins can confirm closure.
//   - Results are severity-ranked (critical > high > medium > low) then by time.
//
// POST { alertId, resolution? }
//   - Marks the alert resolved and writes an ALERT_RESOLVED audit entry whose
//     details record { alertId, resolvedBy, resolution }.
//   - Wrapped in withAdminMutation (auth + rate-limit + trusted-headers + csrf).

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withAdminMutation } from "@/server/http/mutation-guard";
import { RATE_LIMITS } from "@/config/app-constants";
import type { Alert, AlertSeverity } from "@/lib/types";

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const RECENT_RESOLVED_DAYS = 7;

function mAlert(row: Record<string, unknown>): Alert {
  return {
    id: String(row.id ?? ""),
    severity: (row.severity as AlertSeverity | undefined) ?? "low",
    title: String(row.title ?? ""),
    message: String(row.message ?? ""),
    gateId: row.gate_id != null ? String(row.gate_id) : undefined,
    studentRoll: row.user_unique_id != null ? String(row.user_unique_id) : undefined,
    timestamp: String(row.timestamp ?? new Date().toISOString()),
    resolved: Boolean(row.resolved),
  };
}

async function handleGet(req: NextRequest, _ctx: { auth: { userId: string; role: string } }) {
  const includeResolved = req.nextUrl.searchParams.get("includeResolved") === "true";

  try {
    const db = getSupabaseServiceClient();
    const { data: unresolved, error: unErr } = await db
      .from("alerts")
      .select("id, severity, title, message, gate_id, user_unique_id, timestamp, resolved")
      .eq("resolved", false)
      .order("timestamp", { ascending: false })
      .limit(200);

    if (unErr) throw new Error(unErr.message);

    let items: Alert[] = (unresolved ?? []).map(mAlert);

    if (includeResolved) {
      const since = new Date(
        Date.now() - RECENT_RESOLVED_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();
      const { data: resolved, error: resErr } = await db
        .from("alerts")
        .select("id, severity, title, message, gate_id, user_unique_id, timestamp, resolved, resolved_at, resolved_by")
        .eq("resolved", true)
        .gte("resolved_at", since)
        .order("resolved_at", { ascending: false })
        .limit(200);

      if (!resErr && resolved) {
        items = [
          ...items,
          ...resolved.map((r: Record<string, unknown>) => ({
            ...mAlert(r),
            resolvedAt: r.resolved_at != null ? String(r.resolved_at) : undefined,
            resolvedBy: r.resolved_by != null ? String(r.resolved_by) : undefined,
          })),
        ];
      }
    }

    // Severity-ranked: critical first; ties broken by recency (newest first).
    items = items.sort((a, b) => {
      const w = (SEVERITY_WEIGHT[a.severity] ?? 0) - (SEVERITY_WEIGHT[b.severity] ?? 0);
      if (w !== 0) return w;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return NextResponse.json({
      success: true,
      data: {
        items,
        unresolvedCount: items.filter((i) => !i.resolved).length,
      },
    });
  } catch (error) {
    console.error("Error fetching admin alerts:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to load alerts" },
      },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest, { auth }: { auth: { userId: string; email: string } }) {
  let body: { alertId?: string; resolution?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const alertId = body.alertId;
  const resolution = typeof body.resolution === "string" ? body.resolution.trim() : undefined;

  if (!alertId) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "alertId is required" } },
      { status: 400 }
    );
  }

  try {
    const db = getSupabaseServiceClient();

    const { data: existing, error: findErr } = await db
      .from("alerts")
      .select("id, resolved, title")
      .eq("id", alertId)
      .maybeSingle();

    if (findErr) throw new Error(findErr.message);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Alert not found" } },
        { status: 404 }
      );
    }

    if (!existing.resolved) {
      const nowIso = new Date().toISOString();
      const { error: updErr } = await db
        .from("alerts")
        .update({ resolved: true, resolved_at: nowIso, resolved_by: auth.userId })
        .eq("id", alertId);
      if (updErr) throw new Error(updErr.message);
    }

    await addAudit({
      action: "ALERT_RESOLVED",
      userId: auth.userId,
      role: "admin",
      details: {
        alertId,
        resolvedBy: auth.userId,
        resolution: resolution || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: alertId,
        resolved: true,
        resolvedBy: auth.userId,
        resolvedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error resolving alert via admin route:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to resolve alert" },
      },
      { status: 500 }
    );
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] });

export const POST = withAdminMutation(handlePost, { rateLimit: RATE_LIMITS.mutation });
