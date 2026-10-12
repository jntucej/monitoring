// src/app/api/permissions/my-counts/route.ts
// SCAFFOLD:TICKETS — per-user ticket rollup for the KPI strip.

import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  const svc = getSupabaseServiceClient();
  const { data, error } = await svc
    .from("permission_requests")
    .select("status")
    .eq("student_user_id", auth.userId);

  if (error) {
    return NextResponse.json(
      { success: false, code: "DB_ERROR", error: error.message },
      { status: 500 },
    );
  }

  const counts = {
    pending: 0, approved: 0, rejected: 0, completed: 0, cancelled: 0, total: 0,
  };

  for (const row of data ?? []) {
    const status = (row as { status: string }).status;
    counts.total++;
    if (status === "PENDING") counts.pending++;
    else if (status === "APPROVED") counts.approved++;
    else if (status === "REJECTED") counts.rejected++;
    else if (status === "COMPLETED") counts.completed++;
    else if (status === "CANCELLED") counts.cancelled++;
  }

  return NextResponse.json({ success: true, data: counts });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "perm_my_counts",
  maxRequests: 120,
});
