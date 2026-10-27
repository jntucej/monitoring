import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withAdminMutation } from "@/server/http/mutation-guard";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit } from "@/lib/db";
import { RATE_LIMITS } from "@/config/app-constants";
import type { AuthContext } from "@/lib/authContext";

const VALID_TRANSITIONS: Record<string, string[]> = {
  open: ["in_progress", "resolved", "closed"],
  in_progress: ["resolved", "open"],
  resolved: ["closed", "in_progress", "open"],
  closed: [],
};

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const filtered = segments.filter((s) => s !== "comments");
  return decodeURIComponent(filtered[filtered.length - 1]);
}

async function handlePatch(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const id = getIdFromPath(req);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_JSON", message: "request body must be JSON" } },
      { status: 400 },
    );
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_BODY", message: "body must be an object" } },
      { status: 400 },
    );
  }
  const payload = body as Record<string, unknown>;

  const supabase = getSupabaseServiceClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "ticket not found" } },
      { status: 404 },
    );
  }

  const fromStatus = existing.status as string;
  const updateFields: Record<string, unknown> = {};

  if (typeof payload.status === "string" && payload.status) {
    const toStatus = payload.status;
    const allowed = VALID_TRANSITIONS[fromStatus] ?? ["open", "in_progress", "resolved", "closed"];
    if (!allowed.includes(toStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_TRANSITION",
            message: `Cannot transition from ${fromStatus} to ${toStatus}`,
          },
        },
        { status: 400 },
      );
    }
    updateFields.status = toStatus;
  }

  if (typeof payload.priority === "string" && payload.priority) updateFields.priority = payload.priority;
  if (typeof payload.category === "string" && payload.category) updateFields.category = payload.category;
  if (typeof payload.assigned_to === "string" && payload.assigned_to) updateFields.assigned_to = payload.assigned_to;
  if (typeof payload.assigned_name === "string" && payload.assigned_name) updateFields.assigned_name = payload.assigned_name;
  if (typeof payload.subject === "string" && payload.subject) updateFields.subject = payload.subject;
  if (typeof payload.description === "string" && payload.description) updateFields.description = payload.description;

  updateFields.updated_at = new Date().toISOString();

  if (Object.keys(updateFields).length <= 1) {
    return NextResponse.json(
      { success: false, error: { code: "NO_FIELDS", message: "no updatable fields provided" } },
      { status: 400 },
    );
  }

  const { data: updated, error: dbErr } = await supabase
    .from("support_tickets")
    .update(updateFields)
    .eq("id", id)
    .select("*")
    .single();

  if (dbErr) {
    return NextResponse.json(
      { success: false, error: { code: "DB_ERROR", message: dbErr.message } },
      { status: 500 },
    );
  }

  const toStatus = (updated?.status as string) ?? fromStatus;
  const statusChanged = toStatus !== fromStatus;

  try {
    await addAudit({
      action: "SUPPORT_TICKET_UPDATED",
      userId: auth.userId,
      role: auth.role,
      details: { ticketId: id, from: fromStatus, to: toStatus, statusChanged },
    });
  } catch {}

  return NextResponse.json({ success: true, data: updated });
}

export const PATCH = withAdminMutation(handlePatch, { rateLimit: RATE_LIMITS.mutation });
