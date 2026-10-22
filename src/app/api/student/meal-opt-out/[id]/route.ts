// src/app/api/student/meal-opt-out/[id]/route.ts
// DELETE — cancel/remove a meal opt-out before cutoff.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

function getId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1] ?? "");
}

async function handleDelete(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  if (auth.role !== "student") return fail("FORBIDDEN", "Not allowed", 403);
  const id = getId(req);
  if (!id) return fail("VALIDATION_ERROR", "ID required", 400);

  const { rows } = await query<{ student_id: string; meal_date: string }>(
    `SELECT student_id, meal_date::text AS meal_date FROM public.meal_opt_outs WHERE id = $1::uuid LIMIT 1`,
    [id],
  );
  const opt = rows[0];
  if (!opt || opt.student_id !== auth.userId) return fail("NOT_FOUND", "Opt-out not found", 404);

  // Check cutoff
  const cutoff = new Date(`${opt.meal_date}T06:00:00`);
  if (Date.now() >= cutoff.getTime()) {
    return fail("CUTOFF_PASSED", "Cannot cancel opt-out after cutoff", 422);
  }

  await query(`DELETE FROM public.meal_opt_outs WHERE id = $1::uuid`, [id]);
  await addAudit({
    action: "MEAL_OPT_OUT_DELETED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { optOutId: id },
  });

  return ok({ deleted: true });
}

export const DELETE = withAuthorization(handleDelete);
