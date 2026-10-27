import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";
import { requireTrustedHeaders } from "@/server/http/trusted-headers";
import { err } from "@/lib/api-response";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

/**
 * /api/campus/communities
 *
 * GET  — list all communities with member counts; includes the caller's own
 *        membership flag per community. Open to any authenticated role.
 * POST — create a community. Restricted to admin/sysadmin and users who hold
 *        a moderator/admin membership in at least one community (checked via
 *        DB — a DB membership always outranks the caller's global role).
 *        New communities default to is_moderated = TRUE.
 */

interface CommunityRow {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_moderated: boolean;
  created_at: string | null;
}

type MembershipRole = "member" | "moderator" | "admin";

/** The caller's highest membership role in any community (admin > moderator > member). */
async function highestCommunityRole(db: ReturnType<typeof getSupabaseServiceClient>, userId: string): Promise<MembershipRole | null> {
  const { data, error } = await db
    .from("community_memberships")
    .select("role_in_community")
    .eq("user_id", userId);
  if (error) {
    const e = err("DB_ERROR", error.message, 500);
    throw new Error(e.body.error.message);
  }
  const roles = (data ?? []).map((r) => String((r as { role_in_community?: string }).role_in_community));
  if (roles.includes("admin")) return "admin";
  if (roles.includes("moderator")) return "moderator";
  if (roles.length > 0) return "member";
  return null;
}

async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const untrusted = requireTrustedHeaders(_req);
  if (untrusted) return untrusted;

  const db = getSupabaseServiceClient();

  const { data: communities, error } = await db
    .from("communities")
    .select("id, name, description, icon, is_moderated, created_at")
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) {
    const e = err("DB_ERROR", error.message, 500);
    return NextResponse.json(e.body, { status: e.status });
  }

  const ids = (communities ?? []).map((c) => c.id as string);
  const memberCounts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: counts, error: cntErr } = await db
      .from("community_memberships")
      .select("community_id")
      .in("community_id", ids);
    if (cntErr) {
      const e = err("DB_ERROR", cntErr.message, 500);
      return NextResponse.json(e.body, { status: e.status });
    }
    for (const row of counts ?? []) {
      memberCounts.set(
        String((row as { community_id: string }).community_id),
        (memberCounts.get(String((row as { community_id: string }).community_id)) ?? 0) + 1
      );
    }
  }

  // Caller's own memberships: role flag per community.
  const myRoles = new Map<string, MembershipRole>();
  if (ids.length > 0) {
    const { data: mine, error: myErr } = await db
      .from("community_memberships")
      .select("community_id, role_in_community")
      .eq("user_id", auth.userId);
    if (myErr) {
      const e = err("DB_ERROR", myErr.message, 500);
      return NextResponse.json(e.body, { status: e.status });
    }
    for (const row of mine ?? []) {
      const rec = row as { community_id: string; role_in_community: string };
      myRoles.set(rec.community_id, rec.role_in_community as MembershipRole);
    }
  }

  const rows = (communities ?? []).map((c: CommunityRow) => {
    const myRole = myRoles.get(c.id) ?? null;
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      icon: c.icon,
      isModerated: c.is_moderated,
      memberCount: memberCounts.get(c.id) ?? 0,
      isMember: myRole !== null,
      myRole,
      canModerate: myRole === "moderator" || myRole === "admin" || auth.role === "admin" || auth.role === "sysadmin",
    };
  });

  return NextResponse.json({ success: true, data: { communities: rows } });
}

async function handlePost(req: NextRequest, context: { auth: AuthContext }): Promise<Response> {
  const untrusted = requireTrustedHeaders(req);
  if (untrusted) return untrusted;

  const db = getSupabaseServiceClient();

  // Restricted: admin, sysadmin, and users with an existing moderator/admin
  // membership (checked via DB — membership outranks the global role).
  const role: Role = context.auth.role as Role;
  const allowed = ["admin", "sysadmin"].includes(role);
  if (!allowed) {
    const membershipRole = await highestCommunityRole(db, context.auth.userId);
    if (membershipRole !== "moderator" && membershipRole !== "admin") {
      const e = err("FORBIDDEN", "Only administrators or community moderators can create communities.", 403);
      return NextResponse.json(e.body, { status: e.status });
    }
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    const e = err("BAD_REQUEST", "Invalid JSON body");
    return NextResponse.json(e.body, { status: e.status });
  }

  const name = String((body as Record<string, unknown>).name ?? "").trim();
  if (!name || name.length > 120) {
    const e = err("VALIDATION_ERROR", "name (1-120 chars) is required");
    return NextResponse.json(e.body, { status: e.status });
  }
  const description =
    (body as Record<string, unknown>).description != null
      ? String((body as Record<string, unknown>).description).slice(0, 1000)
      : null;
  const icon =
    (body as Record<string, unknown>).icon != null
      ? String((body as Record<string, unknown>).icon).slice(0, 80)
      : null;

  const { data: inserted, error } = await db
    .from("communities")
    .insert({
      name,
      description,
      icon,
      is_moderated: true,
      created_by: context.auth.userId,
    })
    .select("id, name, description, icon, is_moderated, created_at")
    .single();
  if (error) {
    if (error.code === "23505") {
      const e = err("CONFLICT", "A community with this name already exists", 409);
      return NextResponse.json(e.body, { status: e.status });
    }
    const e = err("DB_ERROR", error.message, 500);
    return NextResponse.json(e.body, { status: e.status });
  }

  // The creator joins as moderator of their own community.
  await db.from("community_memberships").insert({
    community_id: inserted.id,
    user_id: context.auth.userId,
    role_in_community: "moderator",
  });

  await addAudit({
    action: "community_created",
    userId: context.auth.userId,
    role: context.auth.role,
    details: { communityId: inserted.id, name },
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        id: inserted.id,
        name: inserted.name,
        description: inserted.description,
        icon: inserted.icon,
        isModerated: true,
      },
    },
    { status: 201 }
  );
}

const READ_ROLES: readonly Role[] = [
  "operator",
  "admin",
  "sysadmin",
  "supervisor",
  "guardian",
  "parent",
  "hod",
  "student",
  "faculty",
  "staff",
  "worker",
  "visitor",
  "caretaker",
  "deputy_warden",
  "hostel_manager",
  "principal",
  "vice_principal",
  "oie",
  "exam_branch",
  "exam_superintendent",
  "mess_incharge",
];

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: [...READ_ROLES] }),
  { ...RATE_LIMITS.read, keyPrefix: "communities" }
);

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] }),
  { ...RATE_LIMITS.mutation, keyPrefix: "communities" }
);
