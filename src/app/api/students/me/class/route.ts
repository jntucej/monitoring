import { NextRequest, NextResponse } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(
  _req: NextRequest,
  ctx: { auth: AuthContext },
): Promise<Response> {
  try {
    const res = await query<{ class_id: string | null }>(
      `SELECT c.id AS class_id
       FROM public.users u
       LEFT JOIN public.student_details sd ON sd.user_id = u.id
       LEFT JOIN public.classes c
         ON c.department_id = u.department_id
        AND (sd.year IS NULL OR c.year = sd.year)
       WHERE u.id = $1
       LIMIT 1`,
      [ctx.auth.userId],
    );
    const classId = res.rows[0]?.class_id ?? null;
    return NextResponse.json({ success: true, classId });
  } catch {
    return NextResponse.json({ success: true, classId: null });
  }
}

export const GET = withApiChain(handleGet, {
  route: "/api/students/me/class",
  auth: "user",
  requiredRole: ["student", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "student_me_class", maxRequests: 60 },
});
