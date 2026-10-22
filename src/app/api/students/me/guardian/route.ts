// src/app/api/students/me/guardian/route.ts
// GET /api/students/me/guardian — the caller's linked guardian/parent.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const db = getSupabaseServiceClient();
  const { data: details } = await db
    .from("student_details")
    .select("guardian_id")
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!details?.guardian_id) return ok({ guardian: null });

  const { data: guardian } = await db
    .from("users")
    .select("id, name, unique_id, email, phone, role")
    .eq("id", details.guardian_id)
    .maybeSingle();

  return ok({
    guardian: guardian
      ? {
          id: guardian.id,
          name: guardian.name,
          uniqueId: guardian.unique_id,
          email: guardian.email,
          phone: guardian.phone,
          role: guardian.role,
        }
      : null,
  });
}

export const GET = withAuthorization(handleGet);
