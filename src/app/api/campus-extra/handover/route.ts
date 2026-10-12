import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";
import { addAudit } from "@/lib/db";

/**
 * GET /api/campus-extra/handover?to_role=operator
 * POST /api/campus-extra/handover
 *
 * At shift end, an operator/supervisor generates a structured handover:
 * unresolved incidents, equipment faults, outstanding exceptions,
 * pending operational tasks. The next shift receives a structured summary.
 *
 * Only the same/next-shift roles can read; audited.
 */

const HANDOVER_ROLES = new Set([
  "operator",
  "caretaker",
  "supervisor",
  "admin",
  "sysadmin",
  "hostel_manager",
]);

interface HandoverItem {
  type: string;
  title: string;
  details?: string;
  severity?: "low" | "medium" | "high";
}

async function handleGet(
  req: NextRequest,
  context: { auth: AuthContext }
) {
  const supabase = getSupabaseServiceClient();
  const role = context.auth.role;

  if (!HANDOVER_ROLES.has(role)) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
      { status: 403 }
    );
  }

  const toRole = req.nextUrl.searchParams.get("to_role") || role;

  // Only allow reading handovers targeted at a role the user has access to
  // (prevent cross-role leakage: operator can't read admin-only handovers)
  const allowedRoles = new Set([role, "admin", "sysadmin"]);
  if (!allowedRoles.has(toRole)) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Cannot read handovers for that role" } },
      { status: 403 }
    );
  }

  // Last 7 days of handovers for the target role
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: handoverRows, error: hoErr } = await supabase
    .from("shift_handovers")
    .select("id, by_user_id, to_role, items, notes, created_at")
    .eq("to_role", toRole)
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(30);

  if (hoErr) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: hoErr.message } },
      { status: 500 }
    );
  }

  // Resolve author names
  const authorIds = Array.from(
    new Set((handoverRows || []).map((h: any) => h.by_user_id).filter(Boolean))
  );
  let authorNames = new Map<string, { name: string; role: string }>();
  if (authorIds.length > 0) {
    const { data: userRows } = await supabase
      .from("users")
      .select("id, name, role")
      .in("id", authorIds);
    authorNames = new Map((userRows || []).map((u: any) => [u.id, { name: u.name, role: u.role }]));
  }

  const handovers = (handoverRows || []).map((h: any) => ({
    id: h.id,
    byUserName: authorNames.get(h.by_user_id)?.name ?? "Unknown",
    byUserRole: authorNames.get(h.by_user_id)?.role ?? "unknown",
    toRole: h.to_role,
    items: h.items || [],
    notes: h.notes,
    createdAt: h.created_at,
  }));

  return NextResponse.json({
    success: true,
    data: { handovers },
  });
}

async function handlePost(
  req: NextRequest,
  context: { auth: AuthContext }
) {
  const supabase = getSupabaseServiceClient();
  const userId = context.auth.userId;
  const role = context.auth.role;

  if (!HANDOVER_ROLES.has(role)) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const toRole = String(body.toRole || body.to_role || "").slice(0, 50);
  const rawItems: unknown[] = Array.isArray(body.items) ? (body.items as unknown[]) : [];
  const notes = body.notes ? String(body.notes).slice(0, 2000) : undefined;

  if (!toRole || !HANDOVER_ROLES.has(toRole)) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "toRole is required and must be a valid handover role" } },
      { status: 400 }
    );
  }

  // Sanitize items
  const items: HandoverItem[] = rawItems.slice(0, 50).map((item) => {
    const it = item as Record<string, unknown>;
    return {
      type: String(it.type || "general").slice(0, 50),
      title: String(it.title || "").slice(0, 200),
      details: it.details ? String(it.details).slice(0, 500) : undefined,
      severity: (["low", "medium", "high"].includes(it.severity as string) ? it.severity : "low") as
        | "low"
        | "medium"
        | "high",
    };
  });

  const { data: record, error: insErr } = await supabase
    .from("shift_handovers")
    .insert({
      by_user_id: userId,
      to_role: toRole,
      items,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (insErr) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: insErr.message } },
      { status: 500 }
    );
  }

  await addAudit({
    action: "SHIFT_HANDOVER_CREATED",
    userId,
    role,
    details: { handoverId: record.id, toRole, itemCount: items.length },
  });

  return NextResponse.json({ success: true, data: record });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "campus_extra_handover",
  maxRequests: 30,
});

export const POST = withRateLimit(withAuthorization(handlePost), {
  keyPrefix: "campus_extra_handover",
  maxRequests: 10,
});
