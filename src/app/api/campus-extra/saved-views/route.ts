import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit, type RateLimitConfig } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";
import { requireTrustedHeaders } from "@/server/http/trusted-headers";
import { err } from "@/lib/api-response";
import type { AuthContext } from "@/lib/authContext";

type SavedViewRow = {
  id: string;
  user_id: string;
  name: string;
  payload: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

async function handleGet(
  req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const untrusted = requireTrustedHeaders(req);
  if (untrusted) return untrusted;

  const { userId } = auth;
  if (!userId) {
    const { body, status } = err("UNAUTHORIZED", "Not authenticated.", 401);
    return NextResponse.json(body, { status });
  }

  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from("user_saved_views")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    const { body, status } = err("DB_ERROR", error.message, 500);
    return NextResponse.json(body, { status });
  }

  const rows = (data ?? []) as unknown as SavedViewRow[];
  return NextResponse.json({ success: true, data: rows });
}

async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const untrusted = requireTrustedHeaders(req);
  if (untrusted) return untrusted;

  const { userId } = auth;
  if (!userId) {
    const { body, status } = err("UNAUTHORIZED", "Not authenticated.", 401);
    return NextResponse.json(body, { status });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    const { body: b, status } = err("BAD_REQUEST", "Invalid JSON body.", 400);
    return NextResponse.json(b, { status });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    const { body: b, status } = err("VALIDATION_ERROR", "name is required and must be non-empty.", 400);
    return NextResponse.json(b, { status });
  }

  const payload = body.payload && typeof body.payload === "object" ? body.payload : {};
  const sortOrder = typeof body.sort_order === "number" ? body.sort_order : 0;

  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from("user_saved_views")
    .insert({
      user_id: userId,
      name,
      payload,
      sort_order: sortOrder,
    })
    .select("*")
    .single();

  if (error) {
    const { body: b, status } = err("DB_ERROR", error.message, 500);
    return NextResponse.json(b, { status });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}

async function handleDelete(
  req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const untrusted = requireTrustedHeaders(req);
  if (untrusted) return untrusted;

  const { userId } = auth;
  if (!userId) {
    const { body, status } = err("UNAUTHORIZED", "Not authenticated.", 401);
    return NextResponse.json(body, { status });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    const { body: b, status } = err("VALIDATION_ERROR", "id query parameter is required.", 400);
    return NextResponse.json(b, { status });
  }

  const db = getSupabaseServiceClient();
  const { error } = await db
    .from("user_saved_views")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    const { body: b, status } = err("DB_ERROR", error.message, 500);
    return NextResponse.json(b, { status });
  }

  const { data } = await db
    .from("user_saved_views")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    const { body: b, status } = err("NOT_FOUND", "Saved view not found.", 404);
    return NextResponse.json(b, { status });
  }

  return NextResponse.json({ success: true });
}

const readLimit: RateLimitConfig = { ...RATE_LIMITS.read, keyPrefix: "saved_views" };
const writeLimit: RateLimitConfig = { ...RATE_LIMITS.mutation, keyPrefix: "saved_views" };

export const GET = withRateLimit(
  withAuthorization(handleGet),
  readLimit
);
export const POST = withRateLimit(
  withAuthorization(handlePost),
  writeLimit
);
export const DELETE = withRateLimit(
  withAuthorization(handleDelete),
  writeLimit
);
