// src/app/api/admin/reports/route.ts
//
// GET  /api/admin/reports?limit=N
//      Returns the last N generated reports (newest first).
//
// POST /api/admin/reports
//      Body: { title, range, type, source?, csvBody?, payload? }
//      Persists a generated report so the admin/reports list survives refresh.
//
// Auth: admin or sysadmin only.

import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(req: NextRequest, _context: { auth: AuthContext }) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

  const svc = getSupabaseServiceClient();
  const { data, error } = await svc
    .from("generated_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { success: false, code: "DB_ERROR", error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}

async function handlePost(req: NextRequest, context: { auth: AuthContext }) {
  const body = await req.json().catch(() => ({}));

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const range = typeof body.range === "string" ? body.range.trim() : "";
  const type = body.type === "Daily" || body.type === "Weekly" || body.type === "Monthly" ? body.type : "Daily";
  const source = body.source === "auto" ? "auto" : "manual";
  const csvBody = typeof body.csvBody === "string" ? body.csvBody : null;
  const payload = body.payload && typeof body.payload === "object" ? body.payload : null;

  if (!title || !range) {
    return NextResponse.json(
      { success: false, code: "EMPTY_BODY", error: "title and range are required" },
      { status: 400 },
    );
  }

  const svc = getSupabaseServiceClient();
  const { data, error } = await svc
    .from("generated_reports")
    .insert({
      title,
      range_label: range,
      type,
      source,
      csv_body: csvBody,
      payload,
      created_by: context.auth.userId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, code: "DB_ERROR", error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data });
}

export const GET = withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] });
export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "admin_reports_post", maxRequests: 30 },
);
