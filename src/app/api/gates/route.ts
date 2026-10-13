import { NextRequest, NextResponse } from "next/server";
import { err } from "@/lib/api-response";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { getAllGatesLive } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { addAudit } from "@/lib/db";

async function handleGet(req: NextRequest) {
  try {
    const data = await getAllGatesLive();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch gates' }, { status: 500 });
  }
}

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json();
    const service = getSupabaseServiceClient();
    const insertPayload: Record<string, any> = {
      gate_code: body.gateCode || body.gate_code || `G${Date.now().toString(36).toUpperCase()}`,
      name: body.name,
      location: body.location,
      type: body.type,
      audience: body.audience ?? "all",
      is_active: body.isActive ?? true,
    };
    if (body.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)) {
      insertPayload.id = body.id;
    }

    const { data, error } = await service
      .from('gates')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to create gate' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

async function handlePatch(req: NextRequest, ctx: any) {
  const body = await req.json();
  const gateId = req.nextUrl.searchParams.get("id");
  if (!gateId) {
    return NextResponse.json(err("BAD_REQUEST", "id required").body, { status: 400 });
  }
  const svc = getSupabaseServiceClient();
  const patch: Record<string, any> = {};
  if (body.name) patch.name = body.name;
  if (body.location !== undefined) patch.location = body.location;
  if (body.type) patch.type = body.type;
  if (body.audience) patch.audience = body.audience;
  if (body.isActive !== undefined) patch.is_active = body.isActive;
  if (body.gateCode) patch.gate_code = body.gateCode;

  const { data, error } = await svc.from("gates").update(patch).eq("id", gateId).select().single();
  if (error) return NextResponse.json(err("INTERNAL_ERROR", error?.message ?? "Internal error").body, { status: 500 });

  await addAudit({
    action: "GATE_UPDATED",
    userId: ctx?.auth?.userId,
    userName: ctx?.auth?.email,
    role: ctx?.auth?.role,
    details: `Updated gate ${gateId}: ${JSON.stringify(patch)}`,
  });

  return NextResponse.json({ success: true, data });
}

async function handleDelete(req: NextRequest, ctx: any) {
  const gateId = req.nextUrl.searchParams.get("id");
  if (!gateId) return NextResponse.json(err("BAD_REQUEST", "id required").body, { status: 400 });
  const svc = getSupabaseServiceClient();
  // Soft-delete: mark inactive instead of deleting (FK references would break)
  await svc.from("gates").update({ is_active: false }).eq("id", gateId);
  await addAudit({
    action: "GATE_DEACTIVATED",
    userId: ctx?.auth?.userId,
    userName: ctx?.auth?.email,
    role: ctx?.auth?.role,
    details: `Deactivated gate ${gateId}`,
  });
  return NextResponse.json({ success: true, data: { gateId, deactivated: true } });
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "operator"] }),
  { keyPrefix: "gate_get", maxRequests: 50 }
);

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "gate_post", maxRequests: 10 }
);

export const PATCH = withRateLimit(
  withAuthorization(handlePatch, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "gate_patch", maxRequests: 10 }
);

export const DELETE = withRateLimit(
  withAuthorization(handleDelete, { requiredRole: ["sysadmin"] }),
  { keyPrefix: "gate_delete", maxRequests: 5 }
);
