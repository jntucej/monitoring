import { NextRequest, NextResponse } from "next/server";
import { getActiveLockdown, createLockdown, liftLockdown } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { Role } from "@/lib/types";

/** GET /api/admin/lockdown — returns current active lockdown or null */
async function handleGet(req: NextRequest) {
  const lockdown = await getActiveLockdown();
  return NextResponse.json({ success: true, data: lockdown });
}

/** POST /api/admin/lockdown — broadcast a new lockdown */
async function handlePost(req: NextRequest) {
  const actorId = req.headers.get("x-user-id") || "";
  const body = await req.json().catch(() => null);
  const scopes: string[] = body?.scopes ?? [];
  const message: string | null = body?.message ?? null;

  if (!scopes.length) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_SCOPES", message: "scopes[] is required" } },
      { status: 400 }
    );
  }

  const lockdown = await createLockdown(scopes, message, actorId);
  if (!lockdown) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to broadcast lockdown" } },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true, data: lockdown }, { status: 201 });
}

/** DELETE /api/admin/lockdown — lift (end) the active lockdown */
async function handleDelete(req: NextRequest) {
  const actorId = req.headers.get("x-user-id") || "";
  const active = await getActiveLockdown();
  if (!active) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "No active lockdown to lift" } },
      { status: 404 }
    );
  }
  const ok = await liftLockdown(active.id, actorId);
  if (!ok) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to lift lockdown" } },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true, data: null });
}

const adminOnly = { requiredRole: ["admin", "sysadmin"] as Role[] };
const rl = { keyPrefix: "lockdown", maxRequests: 20 };

// Operators can also poll GET to check active state
export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "operator"] }),
  { keyPrefix: "lockdown_get", maxRequests: 120 }
);
export const POST   = withRateLimit(withAuthorization(handlePost,   adminOnly), rl);
export const DELETE = withRateLimit(withAuthorization(handleDelete, adminOnly), rl);
