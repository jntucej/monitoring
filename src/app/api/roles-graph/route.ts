/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { findAllUsers } from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";
import { withAuthorization } from "@/middleware/authorization";

/**
 * GET /api/roles-graph
 *
 * Read-only endpoint that describes the system role hierarchy as a DAG so
 * frontends can render it without hard-coding node/edge lists.
 *
 * Response shape:
 *   {
 *     success: true,
 *     data: {
 *       root: "sysadmin",
 *       nodes: [{ code, display_name, description, icon_name, default_redirect,
 *                 user_count, on_campus }],
 *       edges: [{ parent, child }],
 *       user_counts: { [code]: n },
 *       on_campus_counts: { [code]: n },
 *       totals: { roles, users, onCampus },
 *       generated_at: "ISO-8601"
 *     }
 *   }
 *
 * The hierarchy itself is defined server-side in src/server/policy/roles.ts.
 * Auth: admin, sysadmin, principal, or vice_principal (privilege check via
 * x-user-role header injected by withAuthorization; this route is GET-only
 * — no write verbs).
 */

/** Collapsible role-hierarchy DAG. Node code -> child codes. */
const ROLE_HIERARCHY: Record<string, string[]> = {
  sysadmin: ["admin"],
  admin: ["principal"],
  principal: ["vice_principal"],
  vice_principal: ["hod"],
  hod: ["warden"],
  warden: ["supervisor"],
  supervisor: ["operator", "faculty", "staff", "worker"],
  operator: ["student"],
  faculty: ["student"],
  staff: ["parent"],
  worker: ["guardian"],
  parent: ["guardian"],
  guardian: [],
};

const HIERARCHY_ROOT = "sysadmin";

async function handleGet(req: NextRequest) {
  // Identity headers are injected by withAuthorization from the validated
  // Supabase token — clients cannot forge them.
  const userRole = req.headers.get("x-user-role");
  if (!["admin", "sysadmin", "principal", "vice_principal"].includes(userRole || "")) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Role graph is restricted to admin, sysadmin, principal, and vice principal" } },
      { status: 403 }
    );
  }

  try {
    const service = getSupabaseServiceClient();

    // Active role definitions (fallback list when the table is absent).
    const definitions: any[] = [];
    const defsRes = await service
      .from("config_roles")
      .select("code, display_name, description, icon_name, default_redirect")
      .eq("is_active", true)
      .order("code");
    if (defsRes.data && !defsRes.error) {
      definitions.push(...defsRes.data);
    }

    // Per-role user counts from public.users (admin/sysadmin list).
    const userCounts: Record<string, number> = {};
    let userTotal = 0;
    try {
      const allUsers = await findAllUsers();
      userTotal = allUsers.length;
      for (const u of allUsers) {
        const role = (u?.role || "").toString();
        if (!role) continue;
        userCounts[role] = (userCounts[role] ?? 0) + 1;
      }
    } catch {
      // User counts are best-effort; the graph still works without them.
    }
    for (const code of Object.keys(ROLE_HIERARCHY)) {
      if (userCounts[code] === undefined) userCounts[code] = 0;
    }

    // Per-role on-campus presence from campus_occupancy (current_status = IN).
    const onCampusCounts: Record<string, number> = {};
    let onCampusTotal = 0;
    try {
      const occRes = await service
        .from("campus_occupancy")
        .select("user_id")
        .eq("current_status", "IN");
      onCampusTotal = (occRes.data || []).length;
      if (onCampusTotal > 0) {
        const ids = (occRes.data || []).map((o: any) => o.user_id);
        const occUsersRes = await service.from("users").select("role").in("id", ids);
        for (const u of occUsersRes.data || []) {
          const role = ((u as any).role || "").toString();
          if (!role) continue;
          onCampusCounts[role] = (onCampusCounts[role] ?? 0) + 1;
        }
      }
    } catch {
      // On-campus presence is best-effort; the graph still works without it.
    }
    for (const code of Object.keys(ROLE_HIERARCHY)) {
      if (onCampusCounts[code] === undefined) onCampusCounts[code] = 0;
    }

    // Map definitions onto hierarchy nodes; unknown codes stay as raw nodes.
    const defByCode = new Map(definitions.map((d: any) => [d.code, d]));
    const nodes = Object.keys(ROLE_HIERARCHY).map((code) => ({
      code,
      display_name: defByCode.get(code)?.display_name || code.replace(/_/g, " "),
      description: defByCode.get(code)?.description || "",
      icon_name: defByCode.get(code)?.icon_name || "User",
      default_redirect: defByCode.get(code)?.default_redirect || "",
      user_count: userCounts[code] ?? 0,
      on_campus: onCampusCounts[code] ?? 0,
    }));

    const edges = Object.entries(ROLE_HIERARCHY).flatMap(([parent, children]) =>
      children.map((child) => ({ parent, child }))
    );

    return NextResponse.json({
      success: true,
      data: {
        root: HIERARCHY_ROOT,
        nodes,
        edges,
        user_counts: userCounts,
        on_campus_counts: onCampusCounts,
        totals: { roles: definitions.length, users: userTotal, onCampus: onCampusTotal },
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[roles-graph] failed to build role graph:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to build role graph" } },
      { status: 500 }
    );
  }
}

// Read-only surface: GET only. Privilege check (admin/sysadmin/principal/
// vice_principal) enforced inside handleGet via the trusted x-user-role
// header; auth token validation + account-status enforcement happen in
// withAuthorization.
export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin", "principal", "vice_principal"] }) as any,
  { keyPrefix: "roles_graph", maxRequests: 60 }
);
