// src/app/api/visitors/[id]/route.ts
// GET /api/visitors/[id] — fetch a visitor's log entry with user + host details.
// The [id] param is the visitor user id (visitor_logs.user_id).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import type { AuthContext } from "@/lib/authContext";

function getId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1] ?? "");
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const id = getId(req);
  if (!id) return fail("VALIDATION_ERROR", "id required", 400);

  const isPrivileged = ["operator", "admin", "sysadmin", "supervisor", "caretaker", "deputy_warden", "hostel_manager", "principal"].includes(auth.role);
  if (!isPrivileged && auth.userId !== id) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }

  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from("visitor_logs")
    .select(`*, person:users!visitor_logs_user_id_fkey(id, name, unique_id, email, phone, status), host:users!visitor_logs_host_user_id_fkey(id, name, unique_id)`)
    .eq("user_id", id)
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return fail("DB_ERROR", error.message, 500);
  if (!data) return fail("NOT_FOUND", "Visitor not found", 404);

  return ok({ visitor: data });
}

export const GET = withAuthorization(handleGet);
