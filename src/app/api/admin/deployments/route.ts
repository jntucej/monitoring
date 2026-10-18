// src/app/api/admin/deployments/route.ts
// POST /api/admin/deployments
// CI (or any authorised process) writes deployment events to the `deployments` table.
// Body: { version?, message?, source?, commit? }
// Auth: admin or sysadmin only.

import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, _context: { auth: AuthContext }) {
  const body = await req.json().catch(() => ({}));

  const version: string | null = typeof body.version === "string" ? body.version.trim() : null;
  const message: string | null = typeof body.message === "string" ? body.message.trim() : null;
  const source: string = typeof body.source === "string" ? body.source : "ci";
  const commit: string | null = typeof body.commit === "string" ? body.commit : null;

  if (!version && !message && !commit) {
    return NextResponse.json(
      { success: false, code: "EMPTY_BODY", error: "Provide at least one of: version, message, commit" },
      { status: 400 },
    );
  }

  const svc = getSupabaseServiceClient();
  const { data, error } = await svc
    .from("deployments")
    .insert({
      version: version ?? null,
      message: message ?? null,
      source,
      commit: commit ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, code: "DB_ERROR", error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    data: { id: (data as { id?: string })?.id ?? null },
  });
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "admin_deployments_post", maxRequests: 30 },
);
