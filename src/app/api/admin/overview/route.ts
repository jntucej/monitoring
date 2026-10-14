// src/app/api/admin/overview/route.ts
// Admin overview: aggregated counts + recent campus audit events + occupancy.
//
// Returns:
//   counts:   { users, gatesActive, announcements, openSupportTickets, openAlerts }
//   recentAuditEvents: last 10 non-infra campus audit events
//   occupancy: { onCampusNow }
//
// admin-scoped: requiredRole ['admin','sysadmin'].

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { campusCount } from "@/lib/db";

const INFRA_PREFIXES = [
  "auth_",
  "mfa_",
  "session_",
  "backup_",
  "retention_",
  "db_migration",
  "api_metrics",
  "security_",
  "rls_",
];

function isInfraAction(action: string): boolean {
  const a = action.toLowerCase();
  return INFRA_PREFIXES.some((p) => a.startsWith(p));
}

async function handleGet(_req: NextRequest) {
  void _req;
  try {
    const db = getSupabaseServiceClient();

    const [
      usersRes,
      gatesRes,
      announcementsRes,
      supportRes,
      alertsRes,
      recentAuditRes,
      onCampus,
    ] = await Promise.all([
      db.from("users").select("id", { count: "exact", head: true }),
      db.from("gates").select("id", { count: "exact", head: true }).eq("is_active", true),
      db.from("announcements").select("id", { count: "exact", head: true }),
      db.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      db.from("alerts").select("id", { count: "exact", head: true }).eq("resolved", false),
      db
        .from("audit_logs")
        .select("id, action, user_name, user_role, details, timestamp")
        .order("timestamp", { ascending: false })
        .limit(50),
      campusCount(),
    ]);

    const counts = {
      users: usersRes.count ?? 0,
      gatesActive: gatesRes.count ?? 0,
      announcements: announcementsRes.count ?? 0,
      openSupportTickets: supportRes.count ?? 0,
      openAlerts: alertsRes.count ?? 0,
    };

    // Last 10 campus (non-infra) audit events.
    const recentAuditEvents = ((recentAuditRes.data ?? []) as Record<string, unknown>[])
      .filter((row) => !isInfraAction(String(row.action ?? "")))
      .slice(0, 10)
      .map((row) => {
        let details: unknown = row.details;
        if (typeof details === "string") {
          try {
            details = JSON.parse(details);
          } catch {
            /* keep raw */
          }
        }
        return {
          id: row.id,
          action: row.action,
          userName: row.user_name,
          userRole: row.user_role,
          details,
          timestamp: row.timestamp,
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        counts,
        recentAuditEvents,
        occupancy: { onCampusNow: onCampus },
      },
    });
  } catch (error) {
    console.error("Error building admin overview:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to build overview" },
      },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "admin_overview", maxRequests: 300 }
);
